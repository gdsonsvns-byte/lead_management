import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ account_id: string }> }) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        await verifyRole("SUPERADMIN");

        const { account_id } = await params;
        if (!account_id || account_id.trim() === "") {
            return NextResponse.json({ error: "Invalid Account" }, { status: 400 });
        }

        const isValidAccount = await prisma.account.findUnique({
            where: {
                id: account_id
            }
        })

        if (!isValidAccount) {
            return NextResponse.json({
                error: "Invalide Account"
            }, { status: 404 });
        };

        if (isValidAccount.whatsappApiKey) {
            return NextResponse.json(
                {
                    error: "WhatsApp API key already configured. Remove/Reset it before adding a new one.",
                    status: "ALREADY_CONFIGURED",
                    existingKey: true
                },
                { status: 409 }
            );
        }

        const { whatsappApiKey } = await req.json();

        if (!whatsappApiKey || whatsappApiKey.trim() === "") {
            return NextResponse.json(
                { error: "WhatsApp API key is required" },
                { status: 400 }
            );
        }

        const updatedAccount = await prisma.account.update({
            where: { id: account_id },
            data: {
                whatsappApiKey: whatsappApiKey.trim(),
            }
        });

        return NextResponse.json(
            {
                message: "WhatsApp API Key updated successfully",
                account: {
                    id: updatedAccount.id,
                    businessName: updatedAccount.businessName,
                    updatedAt: new Date()
                }
            },
            { status: 200 }
        );


    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json({
            error: error.message || "Something went wrong"
        }, { status: 500 })
    }
}