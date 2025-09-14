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

// 구독 정보 조회
export async function GET(request: NextRequest) {
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
        const userId = searchParams.get("userId");
        const serviceId = searchParams.get("serviceId");
        const active = searchParams.get("active");

        const where: {
            userId?: string;
            serviceId?: string;
            leftAt?: null | { not: null };
        } = {};
        if (userId) where.userId = userId;
        if (serviceId) where.serviceId = serviceId;
        if (active === "true") where.leftAt = null;
        if (active === "false") where.leftAt = { not: null };

        const subscriptions = await prisma.userSubscription.findMany({
            where,
            include: {
                user: { select: { name: true } },
                service: true,
            },
            orderBy: { joinedAt: "desc" },
        });

        return new Response(JSON.stringify({ subscriptions }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching subscriptions:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 새 구독 생성 (사용자를 서비스에 추가)
// 새 구독 생성 (어드민 전용)
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
        const { userId, serviceId } = body;

        if (!userId || !serviceId) {
            return new Response(
                JSON.stringify({ error: "userId and serviceId are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 서비스 정보 조회
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                _count: {
                    select: { subscriptions: { where: { leftAt: null } } },
                },
            },
        });

        if (!service) {
            return new Response(
                JSON.stringify({ error: "Service not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // 최대 인원 확인
        if (service._count.subscriptions >= service.maxMembers) {
            return new Response(JSON.stringify({ error: "Service is full" }), {
                status: 409,
                headers: { "Content-Type": "application/json" },
            });
        }

        // 이미 구독 중인지 확인
        const existingSubscription = await prisma.userSubscription.findUnique({
            where: { userId_serviceId: { userId, serviceId } },
        });

        if (existingSubscription && !existingSubscription.leftAt) {
            return new Response(
                JSON.stringify({
                    error: "User is already subscribed to this service",
                }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        }

        // 구독 생성 또는 재활성화
        let subscription;
        if (existingSubscription) {
            // 기존 구독 재활성화
            subscription = await prisma.userSubscription.update({
                where: { id: existingSubscription.id },
                data: {
                    leftAt: null,
                    joinedAt: new Date(),
                },
                include: {
                    user: { select: { name: true } },
                    service: true,
                },
            });
        } else {
            // 새 구독 생성
            subscription = await prisma.userSubscription.create({
                data: {
                    userId,
                    serviceId,
                },
                include: {
                    user: { select: { name: true } },
                    service: true,
                },
            });
        }

        return new Response(JSON.stringify(subscription), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: unknown) {
        console.error("Error creating subscription:", error);

        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return new Response(
                JSON.stringify({ error: "Subscription already exists" }),
                { status: 409, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 구독 취소 (사용자를 서비스에서 제거)
// 구독 삭제 (어드민 전용)
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

        const body = await request.json();
        const { userId, serviceId } = body;

        if (!userId || !serviceId) {
            return new Response(
                JSON.stringify({ error: "userId and serviceId are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 구독 정보 조회
        const subscription = await prisma.userSubscription.findUnique({
            where: { userId_serviceId: { userId, serviceId } },
            include: { service: true },
        });

        if (!subscription || subscription.leftAt) {
            return new Response(
                JSON.stringify({ error: "Active subscription not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // 구독 취소 (leftAt 설정)
        const cancelledSubscription = await prisma.userSubscription.update({
            where: { id: subscription.id },
            data: { leftAt: new Date() },
            include: {
                user: { select: { name: true } },
                service: true,
            },
        });

        return new Response(JSON.stringify(cancelledSubscription), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: unknown) {
        console.error("Error cancelling subscription:", error);

        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
