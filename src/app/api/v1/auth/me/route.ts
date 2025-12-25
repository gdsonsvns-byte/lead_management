import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }
        const user = await verifyRole(["SUPERADMIN", "ADMIN"]);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const { searchParams } = new URL(req.url);
        const queryAccountId = searchParams.get("account_id")?.trim() || "";

        if (queryAccountId !== "") {
            const validAccount = await prisma.account.findUnique({
                where: { id: queryAccountId }
            });

            if (!validAccount) {
                return NextResponse.json(
                    { error: "Invalid Account." },
                    { status: 404 }
                );
            }
        }

        if (!user.accountId && queryAccountId === "") {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }

        const finalAccountId = queryAccountId !== "" ? queryAccountId : user.accountId;

        const user_account = await prisma.account.findUnique({
            where: { id: finalAccountId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    }
                },
                forms: {
                    select: {
                        id: true,
                        _count: {
                            select: {
                                responses: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        forms: true,
                        users: true
                    }
                }
            }
        });

        if (!user_account) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }
        const totalResponses = user_account.forms.reduce(
            (sum, f) => sum + f._count.responses, 0
        );

        const initials = generateNameInitials(user_account.businessName)

        return NextResponse.json(
            {
                data: user_account,
                initials,
                total_response: totalResponses,
            },
            { status: 200 }
        );

    } catch (err: any) {
        console.error(err.message);
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}

function generateNameInitials(name?: string | null): string {
    if (!name || !name.trim()) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return first + last;
}