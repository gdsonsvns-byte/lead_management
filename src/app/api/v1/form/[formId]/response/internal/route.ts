import { v2 as cloudinary } from "cloudinary";
import { FollowUpStatus, FollowUpType } from "@/src/app/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { sendResponseAlertEmail, sendResponseAlertEmailToUser } from "@/src/lib/sendResponseAlertEmail";
import { sendWhatsappToAdmin, sendWhatsappToUser } from "@/src/lib/whatsapp";
import { verifyRole } from "@/src/lib/verifyRole";
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken";

export const runtime = "nodejs";

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
    const fileMap: Record<string, File[]> = {};
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["ADMIN", "SUPERADMIN", "MANAGER"]);
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const queryAccountId = searchParams.get("account_id")?.trim();
        const { formId } = await params;
        const accountId = user?.role === "SUPERADMIN" ? queryAccountId! : user?.accountId ?? apiClient?.accountId;

        if (user && user.role === "SUPERADMIN" && !queryAccountId) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }

        if (!formId || formId.trim() === "") {
            return NextResponse.json(
                { error: "Invalid form ID" },
                { status: 400 }
            );
        }

        const form = await prisma.form.findUnique({
            where: { id: formId, accountId },
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
                { status: 404 }
            );
        }

        const super_admin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" }, select: { id: true } });

        const formData = await req.formData();
        const nextActionLabel = formData.get("nextAction")?.toString() || null;
        const nextFollowUpDate = formData.get("nextFollowUpDate")?.toString() || null;
        const assignUserId = formData.get("assignUserId")?.toString() || null;
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
                    { status: 400 }
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
                        { status: 400 }
                    );
                }

                if (file.size > MAX_FILE_SIZE) {
                    return NextResponse.json(
                        { error: `File ${file.name} exceeds 20MB limit` },
                        { status: 400 }
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
                // if (ff.label.toLowerCase().includes("email") || ff.label.toLowerCase().includes("email id") || ff.label.toLowerCase().includes("emailId") || ff.label.toLowerCase().includes("email Id")) {
                //     userEmail = finalValue;
                // }

                await tx.responseAnswer.create({
                    data: {
                        responseId: response.id,
                        fieldId: ff.id,
                        value: finalValue,
                    },
                });
            }

            const assigneeIds = new Set<string>();
            assigneeIds.add(form.userId);
            assigneeIds.add(super_admin?.id!);
            if (assignUserId) assigneeIds.add(assignUserId)

            for (const uid of assigneeIds) {
                await tx.responseAssignment.upsert({
                    where: {
                        responseId_userId: {
                            responseId: response.id,
                            userId: uid,
                        },
                    },
                    update: { isActive: true },
                    create: {
                        responseId: response.id,
                        userId: uid,
                        assignedById: user?.sub ?? null,
                        isActive: true,
                    },
                });
            }

            return response;
        });

        const nextActionData = await prisma.nextActionType.findFirst({
            where: {
                formId,
                ...(nextActionLabel
                    ? { label: nextActionLabel }
                    : { autoApplyOnFirstFollowUp: true }),
            },
            orderBy: { isDefault: "desc" },
        });

        if (!nextActionData) {
            return NextResponse.json(
                { error: "No default follow-up configured for this form" },
                { status: 400 }
            );
        }

        const internalStatus: FollowUpStatus = nextActionData.status;

        const nextDate = internalStatus === FollowUpStatus.COMPLETED ||
            internalStatus === FollowUpStatus.CANCELLED
            ? null
            : nextFollowUpDate
                ? new Date(nextFollowUpDate)
                : new Date();

        const note = nextActionLabel
            ? "Follow-up added by user"
            : "Auto follow-up added by system";

        await prisma.followUp.create({
            data: {
                responseId: result.id,
                addedByUserId: form.userId,
                type: FollowUpType.STATUS_CHANGE,
                note,
                nextFollowUpDate: nextDate,
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

        return NextResponse.json(
            { success: true, responseId: result.id },
            { status: 201 }
        );

    } catch (err: any) {
        console.error("Submit error:", err);
        return NextResponse.json(
            { error: err.message || "Submission failed" },
            { status: 500 }
        );
    }
}