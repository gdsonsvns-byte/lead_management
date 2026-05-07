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

        const { searchParams } = new URL(req.url);
        const page = Math.max(Number(searchParams.get("page")) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
        const skip = (page - 1) * limit;

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                account:{
                    select:{
                        businessName:true
                    }
                }
            },
            skip,
            take: limit
        })

        const totalUsers = await prisma.user.count();

        if (users.length === 0) {
            return NextResponse.json(
                { message: "No account found. Please create one now." },
                { status: 200 }
            );
        }
        const pageCount = Math.ceil(totalUsers / limit);
        return NextResponse.json(
            {
                users,
                page,
                limit,
                totalUsers,
                pageCount,
                hasMore: page < pageCount,
                nextPage: page < pageCount ? page + 1 : null,
                prevPage: page > 1 ? page - 1 : null,
            },
            {
                status: 200,
            }
        );

    } catch (error) {
        console.error("Error at system dashboard/accounts:", error);

        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
}
