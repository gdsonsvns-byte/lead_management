import { NextRequest, NextResponse } from "next/server";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { isRateLimited } from "@/src/lib/limiter";
import { generateRawToken, hashToken } from "@/src/lib/generate_access_token";

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["ADMIN", "SUPERADMIN"]);
        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const accountId = req.nextUrl.searchParams.get("account_id")?.toString().toLocaleLowerCase();
        const body = await req.json();
        const { name } = body;
        if (!name) {
            return NextResponse.json(
                { error: "Token name is required" },
                { status: 400 }
            );
        }

        let targetAccountId: string;
        let createdBy: string;

        if (user.role === "SUPERADMIN") {
            if (!accountId) {
                return NextResponse.json(
                    { error: "accountId is required for SUPERADMIN" },
                    { status: 400 }
                );
            }
            targetAccountId = accountId;
            const user = await prisma.user.findFirst({
                where: {
                    accountId: targetAccountId,
                    role: "ADMIN"
                }
            })
            if (!user) {
                return NextResponse.json(
                    { error: "Target account does not have any ADMIN" },
                    { status: 404 }
                );
            }
            createdBy = user.id;
        } else {
            targetAccountId = user.accountId;
            createdBy = user.sub;
        }

        const rawToken = generateRawToken();
        const tokenHash = hashToken(rawToken);

        await prisma.apiAccessToken.create({
            data: {
                name,
                tokenHash,
                accountId: targetAccountId,
                createdById: createdBy,
            },
        });

        return NextResponse.json(
            {
                token: rawToken,
                message: "Token generated successfully. Copy it now — you won’t see it again.",
            },
            { status: 201 }
        );

    } catch (error) {
        console.error("❌ Token generation error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
