import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }
        const user = await verifyRole(["ADMIN", "SUPERADMIN"]);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const date = searchParams.get("date");
        const page = Math.max(Number(searchParams.get("page")) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
        const skip = (page - 1) * limit;
        if (!id || !date) {
            return NextResponse.json(
                { error: "Invalid request." },
                { status: 400 }
            );
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json(
                { error: "Invalid date format. Use YYYY-MM-DD" },
                { status: 400 }
            );
        }
        const { start, end } = getDayRange(date);

        const followUps = await prisma.followUp.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
                response: {
                    form: {
                        id: id,
                        ...(user.role === "ADMIN" && {
                            accountId: user.accountId,
                        }),
                    },
                },
            },
            select: {
                id: true,
                type: true,
                status: true,
                note: true,
                nextFollowUpDate:true,
                createdAt: true,
                addedBy: {
                    select: {
                        name: true,
                    },
                },
                response: {
                    select: {
                        id: true,
                        form: {
                            select: {
                                title: true,
                            },
                        },
                        answers: {
                            select: {
                                value: true,
                                field: {
                                    select: {
                                        label: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            skip,
            take: limit,
        });

        if (followUps.length === 0) {
            return NextResponse.json(
                { followUps: [] },
                { status: 200 }
            );
        }
        const pageCount = Math.ceil(followUps.length / limit);

        return NextResponse.json({
            followUps,
            page,
            limit,
            totalResponse: followUps.length,
            pageCount,
            hasMore: page < pageCount,
            nextPage: page < pageCount ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null,
        }, { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function getDayRange(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);

    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);

    return { start, end };
}
