import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown";
        if (ip !== "unknown" && isRateLimited(ip)) {
            return NextResponse.json(
                { success: false, message: "Too many requests" },
                { status: 429 }
            );
        }
        if (req.signal.aborted) {
            return new Response(null, { status: 204 });
        }

        const user = await verifyRole("SUPERADMIN");
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const [accounts, users, forms, responses] = await Promise.all([
            prisma.account.count(),
            prisma.user.count({ where: { role: { not: "SUPERADMIN" } } }),
            prisma.form.count(),
            prisma.response.count(),
        ]);

        return NextResponse.json(
            {
                success: true,
                data: { accounts, users, forms, responses },
            },
            {
                status: 200,
            }
        );

    } catch (error) {
        console.error("Error at system dashboard:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}