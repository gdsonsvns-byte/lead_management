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

        const user = await verifyRole(["SUPERADMIN", "ADMIN", "MANAGER"]);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const queryAccountId = searchParams.get("account_id")?.trim() || "";

        if (user.role === "MANAGER") {
            const manager = await prisma.user.findUnique({
                where: { id: user.sub },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    account: {
                        select: {
                            id: true,
                            businessName: true,
                            phone: true,
                            location: true,
                            email: true,
                            createdAt: true,
                        },
                    },
                },
            });

            if (!manager || !manager.account) {
                return NextResponse.json(
                    { error: "Account not found." },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                {
                    account: manager.account,
                    user: {
                        id: manager.id,
                        name: manager.name,
                        email: manager.email,
                        role: manager.role,
                    },
                    initials: generateNameInitials(manager.name),
                },
                { status: 200 }
            );
        }


        const finalAccountId = queryAccountId || user.accountId;

        if (!finalAccountId) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }

        const account = await prisma.account.findUnique({
            where: { id: finalAccountId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                forms: {
                    select: {
                        id: true,
                        _count: {
                            select: { responses: true },
                        },
                    },
                },
                _count: {
                    select: {
                        forms: true,
                        users: true,
                    },
                },
            },
        });

        if (!account) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }

        const totalResponses = account.forms.reduce(
            (sum, f) => sum + f._count.responses,
            0
        );

        return NextResponse.json(
            {
                data: account,
                initials: generateNameInitials(account.businessName),
                total_response: totalResponses,
            },
            { status: 200 }
        );
    } catch (err: any) {
        console.error(err);
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
        return parts[0][0].toUpperCase();
    }
    return (
        parts[0][0].toUpperCase() +
        parts[parts.length - 1][0].toUpperCase()
    );
}
