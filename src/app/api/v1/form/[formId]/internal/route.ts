import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ formId: string }> }) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }
        const user = await verifyRole(["ADMIN", "SUPERADMIN"])
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { formId } = await params
        const { searchParams } = new URL(req.url);
        const queryAccountId = searchParams.get("account_id")?.trim();

        if (user && user.role === "SUPERADMIN" && !queryAccountId) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }

        if (!formId || formId.trim() === "") {
            return NextResponse.json({ error: "Invalid form ID" }, { status: 400 })
        }

        const accountId = user?.role === "SUPERADMIN" ? queryAccountId! : user?.accountId ?? apiClient?.accountId;
        const [form, users] = await Promise.all([
            await prisma.form.findFirst({
                where: { id: formId, accountId },
                include: {
                    fields: {
                        orderBy: {
                            order: "asc",
                        },
                    },
                    nextActions: {
                        select: {
                            id: true,
                            label: true,
                            status: true,
                        },
                        orderBy: {
                            order: "asc"
                        }
                    },
                }
            }),

            await prisma.user.findMany({
                where: {
                    accountId,
                    formAccesses: {
                        some: {
                            formId,
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
                orderBy: {
                    createdAt: "desc"
                }
            })
        ])

        if (!form && !users) return NextResponse.json({ error: "Form or user not found" }, { status: 404 })

        return NextResponse.json({ form, users })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: "Error fetching form" }, { status: 500 })
    }
}