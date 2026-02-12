import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

const PUBLIC_ROUTES = [
    "/login",
    "/forget-password",
    "/reset-password",
];

const ALLOWED_ORIGINS = [
    "https://forms.wizards.co.in",
    "http://localhost:3000",
    "http://localhost:3001"
];

type Role = "ADMIN" | "MANAGER" | "SUPERADMIN";
const ROUTE_PERMISSIONS: Record<string, Role[]> = {
    "/admin/dashboard": ["ADMIN", "MANAGER"],
    "/system_admin": ["SUPERADMIN"],
};
const ROLE_DASHBOARD: Record<Role, string> = {
    ADMIN: "/admin/dashboard",
    MANAGER: "/admin/dashboard",
    SUPERADMIN: "/system_admin/dashboard",
};

function setCorsHeaders(res: NextResponse, origin?: string | null) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.headers.set("Access-Control-Allow-Origin", origin);
        res.headers.set("Access-Control-Allow-Credentials", "true");
    }

    res.headers.set(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS"
    );
    res.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );
}

function safeVerifyToken(token: string | null) {
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET) as {
            sub: string;
            accountId: string;
            role: Role;
        };
    } catch {
        return null;
    }
}


export function proxy(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const origin = req.headers.get("origin");
    const userAgent = req.headers.get("user-agent");
    if (userAgent?.includes("vercel-cron")) {
        return NextResponse.next();
    }

    if (pathname.startsWith("/api")) {
        if (req.method === "OPTIONS") {
            const res = new NextResponse(null, { status: 200 });
            setCorsHeaders(res, origin);
            return res;
        }

        const res = NextResponse.next();
        setCorsHeaders(res, origin);
        return res;
    }

    const token = req.cookies.get("token")?.value || null;
    const decoded = safeVerifyToken(token);
    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!decoded) {
        if (!isPublic) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
        return NextResponse.next();
    }

    if (pathname === "/login") {
        if (decoded.role === "SUPERADMIN") {
            return NextResponse.redirect(
                new URL("/system_admin/dashboard", req.url)
            );
        }
        return NextResponse.redirect(
            new URL("/admin/dashboard", req.url)
        );
    }

    for (const route in ROUTE_PERMISSIONS) {
        if (pathname.startsWith(route)) {
            const allowedRoles = ROUTE_PERMISSIONS[route];

            if (!allowedRoles.includes(decoded.role)) {
                return NextResponse.redirect(
                    new URL(ROLE_DASHBOARD[decoded.role], req.url)
                );
            }
        }
    }

    if (pathname === "/") {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/admin/:path*",
        "/system_admin/:path*",
        "/profile/:path*",
        "/login",
        "/forget-password",
        "/reset-password",
    ],
};
