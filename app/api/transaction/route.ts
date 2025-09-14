import { prisma } from "../../../lib/prisma";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// Admin 인증 검증 함수
async function verifyAdminAuth(): Promise<boolean> {
    try {
        const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
        const cookieStore = await cookies();
        const token = cookieStore.get("admin-token")?.value;

        if (!token) return false;

        await jwtVerify(token, JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}

// 거래 내역 조회
export async function GET(request: NextRequest) {
    try {
        const isAdmin = await verifyAdminAuth();
        if (!isAdmin) {
            return new Response(
                JSON.stringify({ error: "Admin authentication required" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const serviceId = searchParams.get("serviceId");
        const month = searchParams.get("month");
        const status = searchParams.get("status");

        // 특정 거래 조회
        if (id) {
            const transaction = await prisma.transaction.findUnique({
                where: { id },
                include: {
                    service: { select: { name: true, displayName: true } },
                    participants: {
                        include: {
                            user: { select: { name: true } },
                        },
                    },
                },
            });

            if (!transaction) {
                return new Response(
                    JSON.stringify({ error: "Transaction not found" }),
                    {
                        status: 404,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    id: transaction.id,
                    serviceId: transaction.serviceId,
                    totalAmount: transaction.totalAmount,
                    status: transaction.status,
                    type: transaction.type,
                    month: transaction.month,
                    paidAt: transaction.paidAt,
                    description: transaction.description,
                    createdAt: transaction.createdAt,
                    service: transaction.service,
                    participants: transaction.participants,
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // 거래 목록 조회 (필터링 가능)
        const where: {
            serviceId?: string;
            month?: string;
            status?: "PENDING" | "PAID";
        } = {};
        if (serviceId) where.serviceId = serviceId;
        if (month) where.month = month;
        if (status) where.status = status as "PENDING" | "PAID";

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                service: { select: { name: true, displayName: true } },
                participants: {
                    include: {
                        user: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return new Response(JSON.stringify({ transactions }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching transaction:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 새 거래 생성 (월별 구독료 생성)
// 새 거래 생성 (어드민 전용)
export async function POST(request: NextRequest) {
    try {
        // 어드민 인증 확인
        const isAdmin = await verifyAdminAuth();
        if (!isAdmin) {
            return new Response(
                JSON.stringify({ error: "Admin authentication required" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const body = await request.json();
        const { serviceId, month, description, totalAmount } = body;

        if (!serviceId || !month || !totalAmount) {
            return new Response(
                JSON.stringify({
                    error: "serviceId, month, and totalAmount are required",
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 서비스 정보 조회
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                subscriptions: {
                    where: { leftAt: null }, // 현재 활성 구독자만
                    include: { user: true },
                },
            },
        });

        if (!service) {
            return new Response(
                JSON.stringify({ error: "Service not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        if (service.subscriptions.length === 0) {
            return new Response(
                JSON.stringify({
                    error: "No active subscribers for this service",
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 해당 월의 거래가 이미 존재하는지 확인
        const existingTransaction = await prisma.transaction.findFirst({
            where: {
                serviceId,
                month,
                type: "SUBSCRIPTION",
            },
        });

        if (existingTransaction) {
            return new Response(
                JSON.stringify({
                    error: "Transaction for this month already exists",
                }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        }

        // 참여자별 분담 금액 계산
        const participantCount = service.subscriptions.length;
        const shareAmount = Math.ceil(totalAmount / participantCount);

        // 거래 생성
        const transaction = await prisma.transaction.create({
            data: {
                serviceId,
                totalAmount,
                month,
                type: "SUBSCRIPTION",
                status: "PENDING",
                description:
                    description || `${service.displayName} 구독료 (${month})`,
                participants: {
                    create: service.subscriptions.map((subscription) => ({
                        userId: subscription.userId,
                        shareAmount,
                        paymentStatus: "PENDING",
                    })),
                },
            },
            include: {
                service: { select: { name: true, displayName: true } },
                participants: {
                    include: {
                        user: { select: { name: true } },
                    },
                },
            },
        });

        return new Response(JSON.stringify(transaction), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error creating transaction:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 거래 상태 업데이트 및 자동 결제 처리
// 거래 정보 수정 (어드민 전용)
export async function PATCH(request: NextRequest) {
    try {
        // 어드민 인증 확인
        const isAdmin = await verifyAdminAuth();
        if (!isAdmin) {
            return new Response(
                JSON.stringify({ error: "Admin authentication required" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get("action");

        // 자동 결제 처리
        if (action === "process_payments") {
            return await processAutomaticPayments(request);
        }

        // 기존 수동 상태 업데이트
        const body = await request.json();
        const { transactionId, participantId, status, paidAt } = body;

        if (!status) {
            return new Response(
                JSON.stringify({
                    error: "Status is required",
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 개별 참여자 결제 상태 업데이트
        if (participantId) {
            const updateData: {
                paymentStatus: "PENDING" | "PAID";
                paidAt?: Date;
            } = { paymentStatus: status as "PENDING" | "PAID" };
            if (status === "PAID" && !paidAt) {
                updateData.paidAt = new Date();
            } else if (paidAt) {
                updateData.paidAt = new Date(paidAt);
            }

            const participant = await prisma.transactionParticipant.update({
                where: { id: participantId },
                data: updateData,
                include: {
                    user: { select: { name: true } },
                    transaction: {
                        include: {
                            service: { select: { displayName: true } },
                        },
                    },
                },
            });

            return new Response(JSON.stringify(participant), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 전체 거래 상태 업데이트
        if (transactionId) {
            const updateData: {
                status: "PENDING" | "PAID";
                paidAt?: Date;
            } = { status: status as "PENDING" | "PAID" };
            if (status === "PAID" && !paidAt) {
                updateData.paidAt = new Date();
            } else if (paidAt) {
                updateData.paidAt = new Date(paidAt);
            }

            const transaction = await prisma.transaction.update({
                where: { id: transactionId },
                data: updateData,
                include: {
                    service: { select: { name: true, displayName: true } },
                    participants: {
                        include: {
                            user: { select: { name: true } },
                        },
                    },
                },
            });

            return new Response(JSON.stringify(transaction), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(
            JSON.stringify({
                error: "Either transactionId or participantId is required",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    } catch (error: unknown) {
        console.error("Error updating transaction:", error);

        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2025"
        ) {
            return new Response(
                JSON.stringify({
                    error: "Transaction or participant not found",
                }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 거래 삭제
// 거래 삭제 (어드민 전용)
export async function DELETE(request: NextRequest) {
    try {
        // 어드민 인증 확인
        const isAdmin = await verifyAdminAuth();
        if (!isAdmin) {
            return new Response(
                JSON.stringify({ error: "Admin authentication required" }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return new Response(
                JSON.stringify({ error: "Transaction ID is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 거래 존재 여부 확인
        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!transaction) {
            return new Response(
                JSON.stringify({ error: "Transaction not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // 이미 결제한 참여자들 확인
        const paidParticipants = transaction.participants.filter(
            (p) => p.paymentStatus === "PAID"
        );

        // 트랜잭션으로 거래 삭제 및 잔고 복원 처리
        await prisma.$transaction(async (tx) => {
            // 이미 결제한 참여자들의 잔고 복원
            for (const participant of paidParticipants) {
                // 사용자의 현재 잔고에 결제했던 금액을 다시 추가
                await tx.user.update({
                    where: { id: participant.userId },
                    data: {
                        balance: {
                            increment: participant.shareAmount,
                        },
                    },
                });
            }

            // 참여자 데이터 삭제
            await tx.transactionParticipant.deleteMany({
                where: { transactionId: id },
            });

            // 거래 삭제
            await tx.transaction.delete({
                where: { id },
            });
        });

        // 삭제 결과 정보 생성
        const refundInfo = {
            refundedUsers: paidParticipants.map((p) => ({
                userId: p.userId,
                userName: p.user.name,
                refundedAmount: p.shareAmount,
            })),
            totalRefundedAmount: paidParticipants.reduce(
                (sum, p) => sum + p.shareAmount,
                0
            ),
            refundedCount: paidParticipants.length,
        };

        return new Response(
            JSON.stringify({
                success: true,
                message: "Transaction deleted successfully",
                refundInfo,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error deleting transaction:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 자동 결제 처리 헬퍼 함수
async function processAutomaticPayments(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("id");

    if (!transactionId) {
        return new Response(
            JSON.stringify({ error: "Transaction ID is required" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // 거래와 참여자 정보 조회
    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
            participants: {
                include: {
                    user: true,
                },
            },
        },
    });

    if (!transaction) {
        return new Response(
            JSON.stringify({ error: "Transaction not found" }),
            { status: 404, headers: { "Content-Type": "application/json" } }
        );
    }

    interface PaymentResult {
        userId: string;
        userName: string;
        status: "paid" | "already_paid" | "insufficient_balance";
        amount?: number;
        remainingBalance?: number;
        currentBalance?: number;
        requiredAmount?: number;
        shortage?: number;
        message: string;
    }

    const results: PaymentResult[] = [];

    // 각 참여자의 결제 처리
    await prisma.$transaction(async (tx) => {
        for (const participant of transaction.participants) {
            if (participant.paymentStatus === "PAID") {
                results.push({
                    userId: participant.userId,
                    userName: participant.user.name,
                    status: "already_paid",
                    message: "이미 결제 완료",
                });
                continue;
            }

            const user = participant.user;

            if (user.balance >= participant.shareAmount) {
                // 잔고가 충분한 경우: 결제 처리
                await tx.user.update({
                    where: { id: user.id },
                    data: {
                        balance: user.balance - participant.shareAmount,
                    },
                });

                await tx.transactionParticipant.update({
                    where: { id: participant.id },
                    data: {
                        paymentStatus: "PAID",
                    },
                });

                results.push({
                    userId: participant.userId,
                    userName: user.name,
                    status: "paid",
                    amount: participant.shareAmount,
                    remainingBalance: user.balance - participant.shareAmount,
                    message: "결제 완료",
                });
            } else {
                // 잔고가 부족한 경우: 미납 상태 유지
                results.push({
                    userId: participant.userId,
                    userName: user.name,
                    status: "insufficient_balance",
                    currentBalance: user.balance,
                    requiredAmount: participant.shareAmount,
                    shortage: participant.shareAmount - user.balance,
                    message: "잔고 부족",
                });
            }
        }

        // 모든 참여자가 결제 완료된 경우 거래 상태 업데이트
        const allPaid = await tx.transactionParticipant.findMany({
            where: {
                transactionId: transactionId,
                paymentStatus: "PENDING",
            },
        });

        if (allPaid.length === 0) {
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: "PAID",
                    paidAt: new Date(),
                },
            });
        }
    });

    const summary = {
        totalParticipants: transaction.participants.length,
        paidCount: results.filter(
            (r) => r.status === "paid" || r.status === "already_paid"
        ).length,
        pendingCount: results.filter((r) => r.status === "insufficient_balance")
            .length,
    };

    return new Response(
        JSON.stringify({
            success: true,
            message: "Payment processing completed",
            results,
            summary,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
    );
}
