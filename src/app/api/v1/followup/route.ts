import { FollowUpStatus, FollowUpType } from "@/src/app/generated/prisma/enums";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";


interface FollowUpPayload {
    responseId: string;
    type: string;
    note?: string | null;
    nextFollowUpDate?: string | null;
    businessStatus: string;
}
// Create a follow up
export async function POST(req: NextRequest) {
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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await req.json()) as FollowUpPayload;

        if (!body.responseId) {
            return NextResponse.json({ error: "responseId is required" }, { status: 400 });
        }

        if (!body.businessStatus) {
            return NextResponse.json({ error: "businessStatus is required" }, { status: 400 });
        }

        const validBusinessStatuses = [
            "Client Converted",
            "Client will Call",
            "Client will Visit",
            "Client will Message",
            "Call Client",
            "Message Client",
            "Visit Client",
            "Put on Backburner",
            "Client not Interested",
        ];

        if (!validBusinessStatuses.includes(body.businessStatus)) {
            return NextResponse.json({ error: "Invalid business status" }, { status: 400 });
        }

        const parentResponse = await prisma.response.findUnique({
            where: { id: body.responseId },
            include: {
                followUps: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                }
            }
        });

        if (!parentResponse) {
            return NextResponse.json({ error: "Lead response not found" }, { status: 404 });
        }
        const lastFollowUp = parentResponse.followUps[0];
        const closedStatuses = ["Client Converted", "Client not Interested"];
        if (lastFollowUp && closedStatuses.includes(lastFollowUp.businessStatus)) {
            return NextResponse.json(
                {
                    error:
                        `This lead is already marked as "${lastFollowUp.businessStatus}". ` +
                        `No further follow-ups can be added.`,
                },
                { status: 400 }
            );
        }
        let internalStatus: FollowUpStatus = FollowUpStatus.PENDING;

        switch (body.businessStatus) {
            case "Client Converted":
                internalStatus = FollowUpStatus.COMPLETED;
                break;
            case "Client not Interested":
                internalStatus = FollowUpStatus.CANCELLED;
                break;
            case "Put on Backburner":
                internalStatus = FollowUpStatus.SKIPPED;
                break;
            default:
                internalStatus = FollowUpStatus.PENDING;
        }

        const nextDate = body.nextFollowUpDate
            ? new Date(body.nextFollowUpDate)
            : null;

        const followup = await prisma.followUp.create({
            data: {
                responseId: body.responseId,
                addedByUserId: user.sub,
                type: body.type as FollowUpType,
                note: body.note ?? null,
                nextFollowUpDate: nextDate,
                businessStatus: body.businessStatus,
                status: internalStatus,
            },
            include: {
                addedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return NextResponse.json(
            { success: true, followup },
            { status: 201 }
        );
    } catch (err: any) {
        console.error("POST /followup error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to create form" },
            { status: 500 }
        );
    }
}

// Get the follow of of the current date
export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["ADMIN", "SUPERADMIN","MANAGER"]);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const state = (searchParams.get("state") || "pending").toLowerCase();

        const page = Math.max(Number(searchParams.get("page")) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
        const skip = (page - 1) * limit;

        const now = new Date();
        const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59
        );

        const followUps = await prisma.followUp.findMany({
            where: {
                response: {
                    form: {
                        accountId: user.accountId,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            include: {
                addedBy: {
                    select: { id: true, name: true, email: true },
                },
                response: {
                    select: {
                        id: true,
                        submittedAt: true,
                        answers: {
                            select: {
                                value: true,
                                field: {
                                    select: { label: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        const responseMap = new Map<
            string,
            {
                responseId: string;
                response: any;
                lastFollowUp: any;
                followUpHistory: any[];
            }
        >();

        for (const fu of followUps) {
            if (!responseMap.has(fu.responseId)) {
                responseMap.set(fu.responseId, {
                    responseId: fu.responseId,
                    response: fu.response,
                    lastFollowUp: {
                        id: fu.id,
                        status: fu.status,
                        type: fu.type,
                        businessStatus: fu.businessStatus,
                        note: fu.note,
                        nextFollowUpDate: fu.nextFollowUpDate,
                        createdAt: fu.createdAt,
                        addedBy: fu.addedBy,
                    },
                    followUpHistory: [],
                });
            }

            responseMap.get(fu.responseId)!.followUpHistory.push({
                id: fu.id,
                status: fu.status,
                type: fu.type,
                businessStatus: fu.businessStatus,
                note: fu.note,
                nextFollowUpDate: fu.nextFollowUpDate,
                createdAt: fu.createdAt,
                addedBy: fu.addedBy,
            });
        }

        const filtered = Array.from(responseMap.values()).filter((item) => {
            const last = item.lastFollowUp;
            const nextDate = last.nextFollowUpDate
                ? new Date(last.nextFollowUpDate)
                : null;

            switch (state) {
                case "pending":
                    return (
                        last.status === "PENDING" &&
                        nextDate &&
                        nextDate <= endOfToday
                    );

                case "completed":
                    return last.status === "COMPLETED";

                case "cancelled":
                    return last.status === "CANCELLED";

                case "all":
                    return true;

                default:
                    return false;
            }
        });

        const total = filtered.length;
        const paginated = filtered.slice(skip, skip + limit);
        const pageCount = Math.ceil(total / limit);

        return NextResponse.json(
            {
                success: true,
                today: paginated,
                page,
                limit,
                total,
                pageCount,
                hasMore: page < pageCount,
                nextPage: page < pageCount ? page + 1 : null,
                prevPage: page > 1 ? page - 1 : null,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Fetch FollowUps Error:", error.message);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

