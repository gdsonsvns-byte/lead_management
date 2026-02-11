import { fillMissingDays } from "@/src/lib/fillMissingDays";
import { getDateRange } from "@/src/lib/getDateRange";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { success: false, message: "Too many requests" },
                { status: 429 }
            );
        }

        const user = await verifyRole(["SUPERADMIN", "ADMIN", "MANAGER"]);
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);

        const dateRange = searchParams.get("date_range")?.trim() ?? "last_7_days";
        const accountId = searchParams.get("account_id")?.trim();

        if (user.role === "SUPERADMIN" && !accountId) {
            return NextResponse.json(
                { success: false, message: "account_id is required" },
                { status: 400 }
            );
        }

        const { start, end } = getDateRange(dateRange);
        const finalAccountId = user.role === "SUPERADMIN" ? accountId! : user.accountId;

        const grouped = await prisma.response.groupBy({
            by: ["submittedAt"],
            where: {
                submittedAt: {
                    gte: start,
                    lte: end,
                },
                form: {
                    accountId: finalAccountId,
                },
            },
            _count: {
                _all: true,
            },
            orderBy: {
                submittedAt: "asc",
            },
        });

        const dailyMap = new Map<string, number>();

        for (const row of grouped) {
            const day = row.submittedAt.toISOString().slice(0, 10);
            dailyMap.set(day, (dailyMap.get(day) ?? 0) + row._count._all);
        }

        const chartData = fillMissingDays(
            start,
            end,
            Array.from(dailyMap, ([date, count]) => ({ date, count }))
        );

        return NextResponse.json(
            {
                success: true,
                range: dateRange,
                start,
                end,
                total: chartData.reduce((s, d) => s + d.count, 0),
                data: chartData,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("GET /dashboard/leads:", error);

        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
