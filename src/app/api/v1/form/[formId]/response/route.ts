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

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };
}
export async function OPTIONS() {
    return NextResponse.json({}, { status: 200, headers: corsHeaders() });
}


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const MAX_FILE_SIZE = Number(20 * 1024 * 1024);
const ALLOWED_MIME = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

async function uploadToCloudinaryBuffer(buffer: Buffer, fieldId: string) {
    return new Promise<{ url: string; public_id: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { folder: `forms/${fieldId}`, resource_type: "auto" },
            (err, result) => {
                if (err || !result) reject(err);
                else resolve({
                    url: result.secure_url,
                    public_id: result.public_id,
                });
            }
        ).end(buffer);
    });
}

// Saving form data in DB(any one).
export async function POST(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
    const headers = corsHeaders();

    const fileMap: Record<string, File[]> = {};
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const { formId } = await params;

        if (!formId || formId.trim() === "") {
            return NextResponse.json(
                { error: "Invalid form ID" },
                { status: 400, headers }
            );
        }

        const form = await prisma.form.findFirst({
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
            return NextResponse.json(
                { error: "Form not found" },
                { status: 404, headers }
            );
        }

        const formData = await req.formData();
        const incoming: Record<string, any> = {};

        for (const ff of form.fields) {
            const values = formData.getAll(ff.id);

            const files = values.filter((v) => v instanceof File) as File[];
            const texts = values.filter((v) => typeof v === "string") as string[];

            if (texts.length === 1) incoming[ff.id] = texts[0];
            else if (texts.length > 1) incoming[ff.id] = texts;

            if (files.length > 0) fileMap[ff.id] = files;
        }

        for (const ff of form.fields) {
            const simple = incoming[ff.id];
            const file = fileMap[ff.id];

            if (ff.required && !simple && (!file || file.length === 0)) {
                return NextResponse.json(
                    { error: `Field "${ff.label}" is required` },
                    { status: 400, headers }
                );
            }
        }
        const uploadedFiles: Record<string, string[]> = {};

        for (const ff of form.fields) {
            const fileList = fileMap[ff.id];
            if (!fileList) continue;

            uploadedFiles[ff.id] = [];

            for (const file of fileList) {
                if (!ALLOWED_MIME.includes(file.type)) {
                    return NextResponse.json(
                        { error: `File type ${file.type} not allowed` },
                        { status: 400, headers }
                    );
                }

                if (file.size > MAX_FILE_SIZE) {
                    return NextResponse.json(
                        { error: `File ${file.name} exceeds 20MB limit` },
                        { status: 400, headers }
                    );
                }

                const buffer = Buffer.from(await file.arrayBuffer());
                const uploaded = await uploadToCloudinaryBuffer(buffer, ff.id);
                uploadedFiles[ff.id].push(uploaded.url);
            }
        }

        let userPhone: string | null = null;
        let userEmail: string | null = null;
        const fieldValuesForAdmin: string[] = [];

        const result = await prisma.$transaction(async (tx) => {
            const response = await tx.response.create({
                data: { formId: form.id },
            });


            for (const ff of form.fields) {
                const simpleValue = incoming[ff.id];
                const urls = uploadedFiles[ff.id];

                let finalValue = "";

                if (urls?.length) {
                    finalValue = urls.length === 1 ? urls[0] : JSON.stringify(urls);
                } else if (simpleValue) {
                    finalValue = Array.isArray(simpleValue)
                        ? JSON.stringify(simpleValue)
                        : String(simpleValue);
                }
                fieldValuesForAdmin.push(finalValue || "");
                if (ff.label.toLowerCase().includes("phone") || ff.label.toLowerCase().includes("mobile") || ff.label.toLowerCase().includes("phone no.") || ff.label.toLowerCase().includes("contact no.") || ff.label.toLowerCase().includes("contact")) {
                    userPhone = finalValue;
                }
                if (ff.label.toLowerCase().includes("email") || ff.label.toLowerCase().includes("email id") || ff.label.toLowerCase().includes("emailId") || ff.label.toLowerCase().includes("email Id")) {
                    userEmail = finalValue;
                }

                await tx.responseAnswer.create({
                    data: {
                        responseId: response.id,
                        fieldId: ff.id,
                        value: finalValue,
                    },
                });
            }

            return response;
        });

        const followup = await prisma.followUp.create({
            data: {
                responseId: result.id,
                addedByUserId: form.userId,
                type: FollowUpType.STATUS_CHANGE,
                note: "Auto Follow up add by the System.",
                nextFollowUpDate: new Date(),
                businessStatus: "Call Client",
                status: FollowUpStatus.PENDING,
            },
            include: {
                addedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
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

        return NextResponse.json(
            { success: true, responseId: result.id },
            { status: 201, headers }
        );

    } catch (err: any) {
        console.error("Submit error:", err);
        return NextResponse.json(
            { error: err.message || "Submission failed" },
            { status: 500 }
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
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }
        const { searchParams } = new URL(req.url);
        const page = Math.max(Number(searchParams.get("page")) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
        const skip = (page - 1) * limit;
        const { formId } = await params;

        let state = (searchParams.get("state") || "pending_today").toLowerCase();
        const now = new Date();
        // const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const whereCondition: any = {
            id: formId,
        };

        if (user?.role === "ADMIN" || user?.role === "MANAGER") {
            whereCondition.accountId = user.accountId;
        } else if (!user && apiClient) {
            whereCondition.accountId = apiClient.accountId;
        }

        const form = await prisma.form.findUnique({
            where: whereCondition,
            include: {
                fields: {
                    orderBy: { order: "asc" },
                },
                responses: {
                    skip,
                    take: limit,
                    orderBy: { submittedAt: "desc" },
                    include: {
                        answers: {
                            include: {
                                field: {
                                    select: {
                                        label: true,
                                        order: true,
                                    },
                                },
                            },
                            orderBy: {
                                field: {
                                    order: "asc",
                                },
                            },
                        },
                        followUps: {
                            orderBy: { createdAt: "desc" },
                            include: {
                                addedBy: {
                                    select: { id: true, name: true, email: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!form) {
            return NextResponse.json({ error: "Form not found" }, { status: 404 });
        }

        const allResponses = await prisma.response.findMany({
            where: { formId: formId },
            include: {
                followUps: {
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        const filteredResponseIds = allResponses
            .filter(res => {
                const lastFollowUp = res.followUps[0] || null;

                if (!lastFollowUp) return state === "all";

                const nextDate = lastFollowUp.nextFollowUpDate
                    ? new Date(lastFollowUp.nextFollowUpDate)
                    : null;

                switch (state) {
                    case "pending_today":
                        return (
                            lastFollowUp.status === "PENDING" &&
                            nextDate &&
                            nextDate <= endOfToday
                        );
                    case "pending":
                        return (
                            lastFollowUp.status === "PENDING"
                        );
                    case "completed":
                        return lastFollowUp.status === "COMPLETED";
                    case "cancelled":
                        return lastFollowUp.status === "CANCELLED";
                    case "all":
                        return true;
                    default:
                        return true;
                }
            })
            .map(r => r.id);

        const responseCount = filteredResponseIds.length;

        if (responseCount === 0) {
            return NextResponse.json(
                { message: "No response found." },
                { status: 404 }
            );
        }

        const paginatedResponses = await prisma.response.findMany({
            where: { id: { in: filteredResponseIds } },
            skip,
            take: limit,
            orderBy: { submittedAt: "desc" },
            include: {
                answers: true,
                followUps: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        addedBy: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        // const formatted = paginatedResponses.map((res, idx) => {
        //     const answerMap: Record<string, any> = {};

        //     for (const ans of res.answers) {
        //         const field = form.fields.find((f) => f.id === ans.fieldId);
        //         let value = ans.value;

        //         if (value?.startsWith("[") && value.endsWith("]")) {
        //             try {
        //                 value = JSON.parse(value);
        //             } catch { }
        //         }

        //         answerMap[field?.label || ans.fieldId] = value;
        //     }

        //     const followUps = res.followUps;
        //     const lastFollowUp = followUps[0] ?? null;
        //     const nextFollowUpDate = followUps.find(f => f.nextFollowUpDate)?.nextFollowUpDate ?? null;

        //     return {
        //         idx: idx + 1,
        //         responseId: res.id,
        //         submittedAt: res.submittedAt,
        //         answers: answerMap,
        //         followUps,
        //         followUpCount: followUps.length,
        //         lastFollowUp,
        //         nextFollowUpDate,
        //         leadStatus: lastFollowUp?.status ?? "PENDING"
        //     };
        // });
        const formatted = paginatedResponses.map((res, idx) => {
            const answerMap: Record<string, any> = {};

            for (const ans of res.answers) {
                const field = form.fields.find((f) => f.id === ans.fieldId);
                let value = ans.value;

                if (value?.startsWith("[") && value.endsWith("]")) {
                    try {
                        value = JSON.parse(value);
                    } catch { }
                }

                answerMap[field?.label || ans.fieldId] = value;
            }

            const followUps = res.followUps;
            const lastFollowUp = followUps[0] ?? null;
            const nextFollowUpDate = followUps.find(f => f.nextFollowUpDate)?.nextFollowUpDate ?? null;

            return {
                idx: idx + 1,
                responseId: res.id,
                submittedAt: res.submittedAt,
                answers: answerMap,
                followUps,
                followUpCount: followUps.length,
                lastFollowUp,
                nextFollowUpDate,
                leadStatus: lastFollowUp?.status ?? "PENDING"
            };
        });

        const pageCount = Math.ceil(responseCount / limit);

        return NextResponse.json({
            id: form.id,
            formId: form.formsId,
            title: form.title,
            description: form.description,
            responses: formatted,
            page,
            limit,
            totalResponse: responseCount,
            pageCount,
            hasMore: page < pageCount,
            nextPage: page < pageCount ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null,
        }, { status: 200 });

    } catch (error: any) {
        console.error("Retrieve error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch responses" },
            { status: 500 }
        );
    }
}
