import { NextResponse, NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

const PUBLIC_ROUTES = [
    "/login",
    "/forget-password",
    "/reset-password"
];

const ROLE_ROUTES = {
    ADMIN: ["/admin"],
    SUPERADMIN: ["/system_admin", "/superadmin"],
};
const ROLE_DASHBOARD: Record<"ADMIN" | "MANAGER" | "SUPERADMIN", string> = {
    ADMIN: "/admin/dashboard",
    MANAGER: "/admin/dashboard",
    SUPERADMIN: "/system_admin/dashboard",
};

function safeVerifyToken(token: string | null) {
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET) as {
            sub: string;
            accountId: string;
            role: "ADMIN" | "SUPERADMIN" | "MANAGER";
        };
    } catch {
        return null;
    }
}

export function proxy(req: NextRequest) {
    const pathname = req.nextUrl.pathname;
    const token = req.cookies.get("token")?.value || null;
    const decoded = safeVerifyToken(token);

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!decoded) {
        if (!isPublic) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
        return NextResponse.next();
    }

    if (isPublic) {
        if (decoded.role === "ADMIN" || decoded.role === "MANAGER") {
            return NextResponse.redirect(new URL("/admin/dashboard", req.url));
        }
        if (decoded.role === "SUPERADMIN") {
            return NextResponse.redirect(new URL("/system_admin/dashboard", req.url));
        }
    }

    for (const role in ROLE_ROUTES) {
        const allowedPaths = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES];

        const isRestrictedPage = allowedPaths.some((route) =>
            pathname.startsWith(route)
        );

        if (isRestrictedPage && decoded.role !== role) {
            const userDashboard = ROLE_DASHBOARD[decoded.role];
            return NextResponse.redirect(new URL(userDashboard, req.url));
        }
    }

    if (pathname === '/') {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/admin/:path*",
        "/system_admin/:path*",
        "/superadmin/:path*",
        "/profile/:path*",
        "/login",
        "/forget-password",
        "/reset-password",
    ],
};
