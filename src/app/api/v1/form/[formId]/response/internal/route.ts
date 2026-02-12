import { v2 as cloudinary } from "cloudinary";
import { FollowUpStatus, FollowUpType } from "@/src/app/generated/prisma/enums";
import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { sendResponseAlertEmail, sendResponseAlertEmailToUser } from "@/src/lib/sendResponseAlertEmail";
import { sendWhatsappToAdmin, sendWhatsappToUser } from "@/src/lib/whatsapp";
import { verifyRole } from "@/src/lib/verifyRole";
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken";

// Saving form data in DB(any one).
export async function POST(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {

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

        const { formId } = await params;
        if (!formId?.trim()) {
            return NextResponse.json(
                { error: "Invalid form ID" },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const queryAccountId = searchParams.get("account_id")?.trim();

        const accountId = user?.role === "SUPERADMIN" ? queryAccountId! : user?.accountId ?? apiClient?.accountId;

        if (user && user.role === "SUPERADMIN" && !queryAccountId) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
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

        const super_admin = await prisma.user.findFirst({
            where: {
                role: "SUPERADMIN"
            },
            select: { id: true }
        });

        let userPhone: string | null = null;
        let userEmail: string | null = null;
        const fieldValuesForAdmin: string[] = [];

        const response = await prisma.$transaction(async (tx) => {
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

            const assignees = new Set<string>();
            assignees.add(super_admin?.id!);

            if (selectedUserIds.length) {
                selectedUserIds.forEach((id: string) => assignees.add(id));
            } else {
                assignees.add(form.userId);
            }

            for (const uid of assignees) {
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
                        assignedById: user?.sub ?? null,
                        isActive: true,
                    },
                });
            }

            return res;
        });

        const nextActionData = await prisma.nextActionType.findFirst({
            where: {
                formId,
                ...(nextAction
                    ? { label: nextAction }
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

        const status: FollowUpStatus = nextActionData.status;
        const nextDate =
            status === FollowUpStatus.COMPLETED ||
                status === FollowUpStatus.CANCELLED
                ? null
                : nextFollowUpDate
                    ? new Date(nextFollowUpDate)
                    : new Date();

        await prisma.followUp.create({
            data: {
                responseId: response.id,
                addedByUserId: form.userId,
                type: FollowUpType.STATUS_CHANGE,
                note: nextAction ? "Follow-up added by user" : "Auto follow-up",
                nextFollowUpDate: nextDate,
                businessStatus: nextActionData.label,
                status,
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
            { success: true, responseId: response.id },
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