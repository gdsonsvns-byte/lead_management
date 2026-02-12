import { v2 as cloudinary } from "cloudinary";
import { FollowUpStatus, FollowUpType } from "@/src/app/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { sendResponseAlertEmail, sendResponseAlertEmailToUser } from "@/src/lib/sendResponseAlertEmail";
import { sendWhatsappToAdmin, sendWhatsappToUser } from "@/src/lib/whatsapp";
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken";


export const runtime = "nodejs";
export const maxDuration = 60;

function corsHeaders(origin?: string | null) {
    return {
        "Access-Control-Allow-Origin": origin ?? "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
}

function withCors(body: any, status = 200, origin?: string | null) {
    return NextResponse.json(body, {
        status,
        headers: corsHeaders(origin),
    });
}
export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get("origin");
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders(origin),
    });
}


// Saving form data in DB(any one).
export async function POST(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
    const origin = req.headers.get("origin");
    try {
        const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";

        if (isRateLimited(ip)) {
            return withCors(
                { error: "Too many requests. Try again later." },
                429,
                origin
            );
        }

        const { formId } = await params;

        if (!formId?.trim()) {
            return withCors(
                { error: "Invalid form ID" },
                400,
                origin
            );
        }

        const form = await prisma.form.findUnique({
            where: { id: formId },
            select: {
                id: true,
                title: true,
                userId: true,
                userWhatsappCampaignName: true,
                adminWhatsappCampaignName: true,
                fields: true,
                account: true,
            },
        });

        if (!form) {
            return withCors(
                { error: "Form not found" },
                404,
                origin
            );
        }

        const body = await req.json();
        const { nextAction, nextFollowUpDate, selectedUserIds = [], ...fieldPayload } = body;

        for (const field of form.fields) {
            const value = fieldPayload[field.id];

            if (field.required && (value === undefined || value === null || (Array.isArray(value) && value.length === 0) ||
                value === "")) {
                return NextResponse.json(
                    { error: `Field "${field.label}" is required` },
                    { status: 400 }
                );
            }
        }

        const super_admin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" }, select: { id: true } });

        let userPhone: string | null = null;
        let userEmail: string | null = null;
        const fieldValuesForAdmin: string[] = [];

        const result = await prisma.$transaction(async (tx) => {
            const res = await tx.response.create({
                data: { formId: form.id },
            });


            for (const field of form.fields) {
                const value = fieldPayload[field.id];
                let finalValue = "";

                if (Array.isArray(value)) {
                    finalValue = JSON.stringify(value);
                } else if (value) {
                    finalValue = String(value);
                }

                fieldValuesForAdmin.push(finalValue);

                if (
                    field.label.toLowerCase().includes("phone") ||
                    field.label.toLowerCase().includes("mobile")
                ) {
                    userPhone = finalValue;
                }

                await tx.responseAnswer.create({
                    data: {
                        responseId: res.id,
                        fieldId: field.id,
                        value: finalValue,
                    },
                });
            }

            const assigneeIds = new Set<string>();
            assigneeIds.add(form.userId);
            assigneeIds.add(super_admin?.id!);

            for (const uid of assigneeIds) {
                await tx.responseAssignment.upsert({
                    where: {
                        responseId_userId: {
                            responseId: res.id,
                            userId: uid,
                        },
                    },
                    update: { isActive: true },
                    create: {
                        responseId: res.id,
                        userId: uid,
                        assignedById: form.userId ?? null,
                        isActive: true,
                    },
                });
            }

            return res;
        });

        const nextActionData = await prisma.nextActionType.findFirst({
            where: {
                formId,
                autoApplyOnFirstFollowUp: true,
            },
            orderBy: { isDefault: "desc" },
        });

        if (!nextActionData) {
            return withCors(
                { error: "No default follow-up configured for this form" },
                400,
                origin
            );
        }

        const internalStatus: FollowUpStatus = nextActionData.status;
        await prisma.followUp.create({
            data: {
                responseId: result.id,
                addedByUserId: form.userId,
                type: FollowUpType.STATUS_CHANGE,
                note: "Auto Follow up add by the System.",
                nextFollowUpDate: new Date(),
                businessStatus: nextActionData.label,
                status: internalStatus,
            }
        });

        const sendNotificationMessage: Promise<any>[] = [];

        // if (form.account?.email) {
        //     sendNotificationMessage.push(sendResponseAlertEmail({
        //         userEmail: form.account.email,
        //         allFields: fieldValuesForAdmin,
        //         accountName: form.account.businessName ?? "Admin",
        //         formName: form.title
        //     }))
        // }
        // if (userEmail) {
        //     sendNotificationMessage.push(sendResponseAlertEmailToUser({
        //         userEmail, allFields: fieldValuesForAdmin, accountName: form.account?.businessName ?? "User"
        //     })
        //     );
        // }

        if (form.userWhatsappCampaignName && form.account?.whatsappApiKey && userPhone) {
            const phoneStr = String(userPhone).trim();
            const destination = phoneStr.startsWith("+")
                ? phoneStr
                : `+91${phoneStr}`;

            sendNotificationMessage.push(sendWhatsappToUser({
                apiKey: form.account.whatsappApiKey,
                campaignName: form.userWhatsappCampaignName,
                destination,
                userName: form.account.businessName ?? "User",
                templateParams: fieldValuesForAdmin,
            }));
        }

        if (form.adminWhatsappCampaignName && form.account?.whatsappApiKey && form.account.phone) {
            sendNotificationMessage.push(sendWhatsappToAdmin({
                apiKey: form.account.whatsappApiKey,
                campaignName: form.adminWhatsappCampaignName,
                destination: form.account.phone.startsWith("+")
                    ? form.account.phone
                    : `+91${form.account.phone}`,
                userName: form.account.businessName ?? "Admin",
                templateParams: fieldValuesForAdmin,
            }));
        }

        if (sendNotificationMessage.length > 0) {
            await Promise.allSettled(sendNotificationMessage);
        }

        return withCors(
            { success: true, responseId: result.id },
            201,
            origin
        );

    } catch (err: any) {
        console.error("Submit error:", err);
        return withCors(
            { error: err.message || "Submission failed" },
            500,
            origin
        );

    }

}

// Getting all the response for the single form provided according to form id(Only admin and superadmin).
export async function GET(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
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
            return NextResponse.json({ error: "Unauthorized User" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(Number(searchParams.get("page")) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
        const skip = (page - 1) * limit;
        const state = (searchParams.get("state") || "pending_today").toLowerCase();
        const { formId } = await params;
        let userId: string;
        const role = user ? user.role : apiClient?.adminRole;
        const now = new Date();
        const endOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23, 59, 59
        );

        const isAdmin =
            (!!user && (user.role === "ADMIN" || user.role === "SUPERADMIN")) ||
            (!!apiClient && apiClient.adminRole && ["ADMIN", "SUPERADMIN"].includes(apiClient.adminRole));

        const formWhere: any = {
            id: formId,
            ...(role !== "SUPERADMIN" && {
                accessUsers: {
                    some: {
                        userId: userId!
                    }
                }
            })
        };

        if (user?.role === "ADMIN" || user?.role === "MANAGER") {
            formWhere.accountId = user.accountId;
            userId = user.sub
        } else if (!user && apiClient) {
            formWhere.accountId = apiClient.accountId;
            userId = apiClient.adminId
        }

        const form = await prisma.form.findUnique({
            where: formWhere,
            include: {
                fields: { orderBy: { order: "asc" } },
            },
        });

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }

        const responses = await prisma.response.findMany({
            where: {
                formId,
                form: {
                    ...(!isAdmin && {
                        accessUsers: {
                            some: { userId: userId! },
                        },
                    }),
                },
                ...(!isAdmin && {
                    assignments: {
                        some: {
                            userId: userId!,
                            isActive: true,
                        },
                    },
                }),
            },
            orderBy: { submittedAt: "desc" },
            include: {
                form: {
                    select: {
                        nextActions: {
                            select: {
                                id: true,
                                label: true,
                                status: true,
                            },
                            orderBy: {
                                order: "asc",
                            }
                        }
                    }
                },
                answers: {
                    include: {
                        field: {
                            select: { label: true, order: true },
                        },
                    },
                    orderBy: {
                        field: { order: "asc" },
                    },
                },
                followUps: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        addedBy: { select: { id: true, name: true, email: true } },
                    },
                },
                assignments: {
                    where: {
                        user: {
                            role: { not: "SUPERADMIN" }
                        },
                        isActive: true,
                    },
                    select: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        }
                    }
                }
            },
        });

        // const filteredResponses = responses.filter((res) => {
        //     const lastFollowUp = res.followUps[0];
        //     if (!lastFollowUp) return false;

        //     switch (state) {
        //         case "pending_today":
        //             return (
        //                 lastFollowUp.status === "PENDING" &&
        //                 lastFollowUp.nextFollowUpDate &&
        //                 new Date(lastFollowUp.nextFollowUpDate) <= endOfToday
        //             );

        //         case "pending":
        //             return lastFollowUp.status === "PENDING";

        //         case "completed":
        //             return lastFollowUp.status === "COMPLETED";

        //         case "cancelled":
        //             return lastFollowUp.status === "CANCELLED";

        //         case "all":
        //             return true;

        //         default:
        //             return true;
        //     }
        // });
        let finalResponses = responses;

        if (state !== "all") {
            finalResponses = responses.filter((res) => {
                const lastFollowUp = res.followUps[0];
                if (!lastFollowUp) return false;

                switch (state) {
                    case "pending_today":
                        return (
                            lastFollowUp.status === "PENDING" &&
                            lastFollowUp.nextFollowUpDate &&
                            new Date(lastFollowUp.nextFollowUpDate) <= endOfToday
                        );

                    case "pending":
                        return lastFollowUp.status === "PENDING";

                    case "completed":
                        return lastFollowUp.status === "COMPLETED";

                    case "cancelled":
                        return lastFollowUp.status === "CANCELLED";

                    default:
                        return true;
                }
            });
        }

        // const totalResponse = filteredResponses.length;

        // if (totalResponse === 0) {
        //     return NextResponse.json(
        //         { message: "No response found." },
        //         { status: 404 }
        //     );
        // }
        // const paginatedResponses = filteredResponses.slice(skip, skip + limit);
        const totalResponse = finalResponses.length;
        if (totalResponse === 0) {
            return NextResponse.json(
                { message: "No response found." },
                { status: 404 }
            );
        }
        const paginatedResponses = finalResponses.slice(skip, skip + limit);

        const formatted = paginatedResponses.map((res, idx) => {
            const answerMap: Record<string, any> = {};

            for (const ans of res.answers) {
                let value = ans.value;

                if (value?.startsWith("[") && value.endsWith("]")) {
                    try {
                        value = JSON.parse(value);
                    } catch { }
                }

                answerMap[ans.field.label] = value;
            }

            const assignUsers = res.assignments.map(a => ({
                id: a.user.id,
                name: a.user.name,
                role: a.user.role,
            }));

            const followUps = res.followUps;
            const lastFollowUp = followUps[0] ?? null;
            const nextFollowUpDate =
                followUps.find((f) => f.nextFollowUpDate)?.nextFollowUpDate ?? null;

            return {
                idx: skip + idx + 1,
                responseId: res.id,
                submittedAt: res.submittedAt,
                nextActions: res.form.nextActions,
                answers: answerMap,
                followUps,
                followUpCount: followUps.length,
                lastFollowUp,
                nextFollowUpDate,
                assignUsers,
                leadStatus: lastFollowUp?.status ?? "PENDING",
            };
        });

        const pageCount = Math.ceil(totalResponse / limit);

        return NextResponse.json(
            {
                id: form.id,
                formId: form.formsId,
                title: form.title,
                description: form.description,
                responses: formatted,
                page,
                limit,
                totalResponse,
                pageCount,
                hasMore: page < pageCount,
                nextPage: page < pageCount ? page + 1 : null,
                prevPage: page > 1 ? page - 1 : null,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Retrieve error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch responses" },
            { status: 500 }
        );
    }
}

