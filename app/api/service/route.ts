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

// 서비스 목록 조회
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (id) {
            // 특정 서비스 조회
            const service = await prisma.service.findUnique({
                where: { id },
                include: {
                    subscriptions: {
                        where: { leftAt: null },
                        include: {
                            user: { select: { name: true } },
                        },
                    },
                    _count: {
                        select: { subscriptions: { where: { leftAt: null } } },
                    },
                },
            });

            if (!service) {
                return new Response(
                    JSON.stringify({ error: "Service not found" }),
                    {
                        status: 404,
                        headers: { "Content-Type": "application/json" },
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    ...service,
                    currentMembers: service._count.subscriptions,
                    availableSlots:
                        service.maxMembers - service._count.subscriptions,
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // 모든 서비스 조회
        const services = await prisma.service.findMany({
            include: {
                _count: {
                    select: { subscriptions: { where: { leftAt: null } } },
                },
            },
            orderBy: { name: "asc" },
        });

        const servicesWithDetails = services.map((service) => ({
            ...service,
            currentMembers: service._count.subscriptions,
            availableSlots: service.maxMembers - service._count.subscriptions,
        }));

        return new Response(JSON.stringify({ services: servicesWithDetails }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 새 서비스 생성 (어드민 전용)
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
        const { name, displayName, maxMembers = 1 } = body;

        if (!name || !displayName) {
            return new Response(
                JSON.stringify({
                    error: "name and displayName are required",
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const service = await prisma.service.create({
            data: {
                name: name.toLowerCase(),
                displayName,
                maxMembers,
            },
        });

        return new Response(JSON.stringify(service), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: unknown) {
        console.error("Error creating service:", error);

        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2002"
        ) {
            return new Response(
                JSON.stringify({
                    error: "Service with this name already exists",
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

// 서비스 정보 업데이트
// 서비스 정보 수정 (어드민 전용)
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

        const body = await request.json();
        const { id, displayName, maxMembers } = body;

        if (!id) {
            return new Response(
                JSON.stringify({ error: "Service id is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const updateData: {
            displayName?: string;
            maxMembers?: number;
        } = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (maxMembers !== undefined) updateData.maxMembers = maxMembers;

        const service = await prisma.service.update({
            where: { id },
            data: updateData,
        });

        return new Response(JSON.stringify(service), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: unknown) {
        console.error("Error updating service:", error);

        if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "P2025"
        ) {
            return new Response(
                JSON.stringify({ error: "Service not found" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
