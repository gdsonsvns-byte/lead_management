import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
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
        const { formId } = await params

        if (!formId || formId.trim() === "") {
            return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
        }

        const form = await prisma.form.findUnique({
            where: { id: formId },
            select: {
                id: true,
                userId: true,
                adminWhatsappCampaignName: true,
                userWhatsappCampaignName: true,
            },
        });

        if (!form) {
            return NextResponse.json(
                { error: "Form not found" },
                { status: 404 }
            );
        }

        if (user.role === "ADMIN" && form.userId !== user.id) {
            return NextResponse.json(
                { error: "You are not allowed to modify this form." },
                { status: 403 }
            );
        }

        if (form.adminWhatsappCampaignName && form.userWhatsappCampaignName) {
            return NextResponse.json(
                {
                    error: "Campaigns name already configured.",
                    status: "ALREADY_CONFIGURED",
                    existingKey: true
                },
                { status: 409 }
            );
        }

        const body = await req.json();
        const rawAdmin = body.adminWhatsappCampaignName;
        const rawUser = body.userWhatsappCampaignName;

        const adminCampaign = typeof rawAdmin === "string" ? rawAdmin.trim() : null;
        const userCampaign = typeof rawUser === "string" ? rawUser.trim() : null;

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

        const updatedForm = await prisma.form.update({
            where: { id: formId },
            data: {
                adminWhatsappCampaignName: adminCampaign ?? null,
                userWhatsappCampaignName: userCampaign ?? null,
            },
        });

        return NextResponse.json(
            {
                message: "WhatsApp campaign names updated successfully.",
                updatedForm,
            },
            { status: 200 }
        );


    } catch (error: any) {
        console.log("Somrthing went wrong", error.message);
        return NextResponse.json({
            error: error.message || "Something went wrong"
        }, { status: 500 })
    }
}