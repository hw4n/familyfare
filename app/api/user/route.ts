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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get("name");
        const isAdmin = await verifyAdminAuth();

        // Admin이 아니고 name이 없으면 에러
        if (!isAdmin && !name) {
            return new Response(JSON.stringify({ error: "Name is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Admin인 경우 모든 사용자 조회 (name 파라미터가 없을 때)
        if (isAdmin && !name) {
            const users = await prisma.user.findMany({
                include: {
                    transactionParticipations: {
                        where: { paymentStatus: "PENDING" },
                        include: {
                            transaction: {
                                include: {
                                    service: { select: { displayName: true } },
                                },
                            },
                        },
                    },
                    subscriptions: {
                        where: { leftAt: null }, // 현재 구독 중인 서비스만
                        include: { service: true },
                    },
                },
            });

            const usersWithCalculatedData = users.map((user) => {
                const totalUnpaidAmount = user.transactionParticipations.reduce(
                    (sum, p) => sum + p.shareAmount,
                    0
                );

                // 음수 잔고가 있다면 미납 금액에 추가
                const negativeBalanceAmount =
                    user.balance < 0 ? Math.abs(user.balance) : 0;
                const totalUnpaidWithNegativeBalance =
                    totalUnpaidAmount + negativeBalanceAmount;

                const unpaidParticipationIds =
                    user.transactionParticipations.map((p) => p.id);

                const unpaidTransactions = user.transactionParticipations.map(
                    (p) => ({
                        participationId: p.id,
                        transactionId: p.transaction.id,
                        shareAmount: p.shareAmount,
                        month: p.transaction.month,
                        serviceName: p.transaction.service.displayName,
                        totalAmount: p.transaction.totalAmount,
                        paymentStatus: p.paymentStatus,
                    })
                );

                return {
                    id: user.id,
                    name: user.name,
                    balance: user.balance,
                    lastDepositAt: user.lastDepositAt,
                    unpaid: unpaidParticipationIds,
                    unpaidTransactions,
                    totalUnpaidAmount: totalUnpaidWithNegativeBalance,
                    activeSubscriptions: user.subscriptions,
                };
            });

            return new Response(
                JSON.stringify({ users: usersWithCalculatedData }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // 특정 사용자 조회 (기존 로직)
        if (!name) {
            return new Response(JSON.stringify({ error: "Name is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 사용자 조회 (미납 거래 내역 포함)
        const user = await prisma.user.findUnique({
            where: { name },
            include: {
                transactionParticipations: {
                    where: { paymentStatus: "PENDING" },
                    include: {
                        transaction: {
                            include: {
                                service: { select: { displayName: true } },
                            },
                        },
                    },
                },
                subscriptions: {
                    where: { leftAt: null }, // 현재 구독 중인 서비스만
                    include: { service: true },
                },
            },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: "User not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 미납 거래 참여 ID 목록
        const unpaidParticipationIds = user.transactionParticipations.map(
            (p) => p.id
        );

        // 총 미납 금액 계산
        const totalUnpaidAmount = user.transactionParticipations.reduce(
            (sum, p) => sum + p.shareAmount,
            0
        );

        // 음수 잔고가 있다면 미납 금액에 추가
        const negativeBalanceAmount =
            user.balance < 0 ? Math.abs(user.balance) : 0;
        const totalUnpaidWithNegativeBalance =
            totalUnpaidAmount + negativeBalanceAmount;

        // 미납 거래 정보 변환
        const unpaidTransactions = user.transactionParticipations.map((p) => ({
            participationId: p.id,
            transactionId: p.transaction.id,
            shareAmount: p.shareAmount,
            month: p.transaction.month,
            serviceName: p.transaction.service.displayName,
            totalAmount: p.transaction.totalAmount,
            paymentStatus: p.paymentStatus,
        }));

        return new Response(
            JSON.stringify({
                id: user.id,
                name: user.name,
                balance: user.balance,
                lastDepositAt: user.lastDepositAt,
                unpaid: unpaidParticipationIds,
                unpaidTransactions,
                totalUnpaidAmount: totalUnpaidWithNegativeBalance,
                activeSubscriptions: user.subscriptions,
                // hashedPassword는 보안상 제외
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Error fetching user:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 새 사용자 생성 (어드민 전용)
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
        const { name, hashedPassword, initialBalance = 0 } = body;

        if (!name) {
            return new Response(
                JSON.stringify({
                    error: "Name is required",
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const user = await prisma.user.create({
            data: {
                name,
                hashedPassword,
                balance: initialBalance,
            },
        });

        return new Response(
            JSON.stringify({
                id: user.id,
                name: user.name,
                balance: user.balance,
                createdAt: user.createdAt,
            }),
            {
                status: 201,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error: any) {
        console.error("Error creating user:", error);

        // Unique constraint 에러 처리
        if (error.code === "P2002") {
            return new Response(
                JSON.stringify({
                    error: "User with this name already exists",
                }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 사용자 잔고 입금 (어드민 전용)
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

        if (action !== "deposit") {
            return new Response(
                JSON.stringify({ error: "Invalid action. Use action=deposit" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const body = await request.json();
        const { userId, amount } = body;

        if (!userId || !amount || amount <= 0) {
            return new Response(
                JSON.stringify({
                    error: "userId and positive amount are required",
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 사용자 존재 확인
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: "User not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 잔고 입금 처리
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                balance: {
                    increment: amount,
                },
                lastDepositAt: new Date(),
            },
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: "Deposit successful",
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    balance: updatedUser.balance,
                    lastDepositAt: updatedUser.lastDepositAt,
                    depositedAmount: amount,
                },
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Error processing deposit:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
