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
        const queryAccountId = searchParams.get("account_id")?.trim();
        const formId = searchParams.get("form_id")?.trim();
        const responseId = searchParams.get("response_id")?.trim();
        if (user.role === "SUPERADMIN" && !queryAccountId) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }
        if (!formId) {
            return NextResponse.json(
                { error: "form_id is required" },
                { status: 400 }
            );
        }

        const accountId = user.role === "SUPERADMIN" ? queryAccountId! : user.accountId;

        const form = await prisma.form.findFirst({
            where: {
                id: formId,
                accountId,
            },
            select: { id: true },
        });

        if (!form) {
            return NextResponse.json(
                { error: "Form not found or access denied" },
                { status: 404 }
            );
        }

        const [users, responseAccess] = await Promise.all([
            prisma.user.findMany({
                where: {
                    accountId,
                    ...(user.role !== "SUPERADMIN" && { role: { not: "ADMIN" } }),
                    formAccesses: {
                        some: {
                            formId,
                            form: {
                                accountId
                            }
                        }
                    }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
            }),

            responseId
                ? prisma.responseAssignment.findMany({
                    where: {
                        responseId,
                    },
                    select: { userId: true },
                })
                : Promise.resolve([]),
        ]);

        const responseAccessSet = new Set(responseAccess.map(a => a.userId));
        const usersWithAccess = users.map(user => ({
            ...user,
            hasResponseAccess: responseAccessSet.has(user.id),
        }));


        return NextResponse.json(
            {
                users: usersWithAccess,
            },
            { status: 200 }
        );


    } catch (error: any) {
        console.log("Something went wrong", error.message);
        return NextResponse.json({
            error: error.message || "Something went wrong"
        }, { status: 500 })
    };
}