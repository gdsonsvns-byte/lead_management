import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { userId } from "@/src/types/form";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";


export async function PATCH(req: NextRequest) {
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

        const body = await req.json();
        const { success, error, data } = userId.safeParse(body)
        if (!success) {
            return NextResponse.json({ error: z.prettifyError(error) }, { status: 400 })
        }

        const form = await prisma.form.findUnique({
            where: { id: data.formId.trim(), ...(user.role !== "SUPERADMIN" && { accountId: user.accountId }) },
            select: { id: true, accountId: true }
        })
        if (!form) {
            return NextResponse.json(
                { error: "Form not found" },
                { status: 404 }
            );
        }

        const existingAccess = await prisma.formAccess.findMany({
            where: { formId: form.id },
            select: {
                userId: true,
                user: {
                    select: {
                        role: true,
                    },
                },
            },
        });
        const protectedUserIds = new Set(existingAccess.filter(a => a.user.role === "ADMIN" || a.user.role === "SUPERADMIN").map(a => a.userId));
        const existingUserIds = new Set(existingAccess.map(a => a.userId));
        const incomingUserIds = new Set(data.userIds);

        const toAdd = data.userIds.filter(id => !existingUserIds.has(id));
        const toRemove = [...existingUserIds].filter(
            id =>
                !incomingUserIds.has(id) &&
                !protectedUserIds.has(id)
        );


        await prisma.$transaction([
            ...(toAdd.length
                ? [
                    prisma.formAccess.createMany({
                        data: toAdd.map(uid => ({
                            formId: form.id,
                            userId: uid,
                        })),
                        skipDuplicates: true,
                    }),
                ]
                : []),

            ...(toRemove.length
                ? [
                    prisma.formAccess.deleteMany({
                        where: {
                            formId: form.id,
                            userId: { in: toRemove },
                        },
                    }),
                ]
                : []),
        ]);

        return NextResponse.json(
            {
                success: true,
                message: "Form access granted successfully",
            }, { status: 200 }
        );

    } catch (error: any) {
        console.log("Something went wrong", error.message);
        return NextResponse.json({
            error: error.message || "Something went wrong"
        }, { status: 500 })
    }
}

