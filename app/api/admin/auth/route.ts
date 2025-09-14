import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD; // 환경변수에서 가져오기
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// 어드민 로그인
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;

        if (!password) {
            return new Response(
                JSON.stringify({ error: "Password is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (password !== ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "Invalid password" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        // JWT 토큰 생성
        const token = await new SignJWT({ role: "admin" })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("24h")
            .sign(JWT_SECRET);

        // 쿠키에 토큰 설정
        const response = new Response(
            JSON.stringify({ success: true, message: "Login successful" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );

        response.headers.set(
            "Set-Cookie",
            `admin-token=${token}; HttpOnly; Path=/; Max-Age=${
                24 * 60 * 60
            }; SameSite=Strict`
        );

        return response;
    } catch (error) {
        console.error("Error in admin login:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// 어드민 로그아웃
export async function DELETE() {
    const response = new Response(
        JSON.stringify({ success: true, message: "Logout successful" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
    );

    response.headers.set(
        "Set-Cookie",
        "admin-token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict"
    );

    return response;
}

// 인증 상태 확인
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin-token")?.value;

        if (!token) {
            return new Response(JSON.stringify({ authenticated: false }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        await jwtVerify(token, JWT_SECRET);

        return new Response(JSON.stringify({ authenticated: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch {
        return new Response(JSON.stringify({ authenticated: false }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }
}

// 인증 검증 헬퍼 함수
export async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
    try {
        const token = request.cookies.get("admin-token")?.value;
        if (!token) return false;

        await jwtVerify(token, JWT_SECRET);
        return true;
    } catch {
        return false;
    }
}
