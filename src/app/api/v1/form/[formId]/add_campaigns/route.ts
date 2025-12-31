import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";


export async function PATCH(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["SUPERADMIN", "ADMIN"]);
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { formId } = await params

        if (!formId || formId.trim() === "") {
            return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
        }

        const body = await req.json();

        const adminCampaign =
            typeof body.adminWhatsappCampaignName === "string"
                ? body.adminWhatsappCampaignName.trim()
                : null;

        const userCampaign =
            typeof body.userWhatsappCampaignName === "string"
                ? body.userWhatsappCampaignName.trim()
                : null;

        if (adminCampaign && adminCampaign.length > 100) {
            return NextResponse.json(
                { error: "Admin campaign name too long. Max 100 chars." },
                { status: 400 }
            );
        }

        if (userCampaign && userCampaign.length > 100) {
            return NextResponse.json(
                { error: "User campaign name too long. Max 100 chars." },
                { status: 400 }
            );
        }

        if (adminCampaign && adminCampaign.length > 100) {
            return NextResponse.json(
                { error: "Admin campaign name too long. Max 100 chars." },
                { status: 400 }
            );
        }

        const whereCondition: any = {
            id: formId,
            adminWhatsappCampaignName: null,
            userWhatsappCampaignName: null,
        };

        if (user?.role === "ADMIN") {
            whereCondition.userId = user.sub;
        }

        if (!user && apiClient) {
            whereCondition.userId = apiClient.adminId;
        }

        const result = await prisma.form.updateMany({
            where: whereCondition,
            data: {
                adminWhatsappCampaignName: adminCampaign,
                userWhatsappCampaignName: userCampaign,
            },
        });

        if (result.count === 0) {
            return NextResponse.json(
                {
                    error: "Form not found, already configured, or permission denied.",
                    status: "NOT_UPDATED",
                },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { message: "WhatsApp campaign names updated successfully." },
            { status: 200 }
        );

    } catch (error: any) {
        console.log("Somrthing went wrong", error.message);
        return NextResponse.json({
            error: error.message || "Something went wrong"
        }, { status: 500 })
    }
}