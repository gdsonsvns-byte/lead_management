import { FollowUpStatus, FollowUpType } from "@/src/app/generated/prisma/enums";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";


interface FollowUpPayload {
    responseId: string;
    type: string;
    note?: string | null;
    nextFollowUpDate?: string | null;
    businessStatus: string;
    status: string;
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

        const user = await verifyRole(["SUPERADMIN", "ADMIN", "MANAGER"]);
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }
        let userId: string | null = null;
        if (user?.role === "ADMIN" || user?.role === "MANAGER") {
            userId = user.sub;
        } else if (!user && apiClient) {
            userId = apiClient.adminId;
        } else {
            userId = user?.sub!;
        }

        const body = (await req.json()) as FollowUpPayload;

        if (!body.responseId) {
            return NextResponse.json({ error: "responseId is required" }, { status: 400 });
        }

        if (!body.businessStatus) {
            return NextResponse.json({ error: "businessStatus is required" }, { status: 400 });
        }
        if (!body.status) {
            return NextResponse.json({ error: "status is required" }, { status: 400 });
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

        if (lastFollowUp && (lastFollowUp.status === FollowUpStatus.COMPLETED || lastFollowUp.status === FollowUpStatus.CANCELLED)) {
            return NextResponse.json(
                {
                    error:
                        `This lead is already marked as "${lastFollowUp.businessStatus}". ` +
                        `No further follow-ups can be added.`,
                },
                { status: 400 }
            );
        }

        const nextAction = await prisma.nextActionType.findFirst({
            where: {
                label: body.businessStatus,
                formId: parentResponse.formId
            },
            orderBy: {
                isDefault: "desc",
            },
        });

        if (!nextAction) {
            return NextResponse.json(
                { error: "Invalid next action label" },
                { status: 400 }
            );
        }

        const internalStatus: FollowUpStatus = nextAction.status;

        const nextDate = internalStatus === FollowUpStatus.COMPLETED ||
            internalStatus === FollowUpStatus.CANCELLED
            ? null
            : body.nextFollowUpDate
                ? new Date(body.nextFollowUpDate)
                : null;

        await prisma.followUp.create({
            data: {
                responseId: body.responseId,
                addedByUserId: userId,
                type: body.type as FollowUpType,
                note: body.note ?? null,
                nextFollowUpDate: nextDate,
                businessStatus: nextAction.label,
                status: internalStatus,
            }
        });

        return NextResponse.json(
            { success: true, },
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

        const user = await verifyRole(["SUPERADMIN", "ADMIN", "MANAGER"]);
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const state = (searchParams.get("state") || "pending_today").toLowerCase();

        const page = Math.max(Number(searchParams.get("page")) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
        const skip = (page - 1) * limit;

        const now = new Date();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        let accountId: string | null = null;

        if (user?.role === "ADMIN" || user?.role === "MANAGER") {
            accountId = user.accountId;
        } else if (!user && apiClient) {
            accountId = apiClient.accountId;
        }

        const followUps = await prisma.followUp.findMany({
            where: {
                response: {
                    form: {
                        accountId: accountId,
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
                case "pending_today":
                    return (
                        last.status === "PENDING" &&
                        nextDate &&
                        nextDate <= endOfToday
                    );
                case "pending":
                    return (
                        last.status === "PENDING"
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

