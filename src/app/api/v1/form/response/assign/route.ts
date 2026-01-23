import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { assignResponseUsersSchema } from "@/src/types/form";
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

        const { success, error, data } = assignResponseUsersSchema.safeParse(body)
        if (!success) {
            return NextResponse.json({ error: z.prettifyError(error) }, { status: 400 })
        }

        const { responseId, userIds } = data;

        const response = await prisma.response.findFirst({
            where: {
                id: responseId,
                ...(user.role !== "SUPERADMIN" && { formId: data.formId }),
            },
            select: { id: true },
        });

        if (!response) {
            return NextResponse.json(
                { error: "Response not found or access denied" },
                { status: 404 }
            );
        }

        const existingAssignments = await prisma.responseAssignment.findMany({
            where: {
                responseId,
                isActive: true,
            },
            select: {
                userId: true,
                user: {
                    select: { role: true },
                },
            },
        });

        const protectedUserIds = new Set(
            existingAssignments
                .filter(a => a.user.role === "ADMIN" || a.user.role === "SUPERADMIN")
                .map(a => a.userId)
        );

        const existingUserIds = new Set(
            existingAssignments.map(a => a.userId)
        );

        const incomingUserIds = new Set(userIds);
        const toAdd = userIds.filter(id => !existingUserIds.has(id));

        const toDisable = [...existingUserIds].filter(
            id =>
                !incomingUserIds.has(id) &&
                !protectedUserIds.has(id)
        );


        await prisma.$transaction([
            ...(toAdd.length
                ? toAdd.map(uid =>
                    prisma.responseAssignment.upsert({
                        where: {
                            responseId_userId: {
                                responseId,
                                userId: uid,
                            },
                        },
                        update: {
                            isActive: true,
                            assignedById: user.sub,
                        },
                        create: {
                            responseId,
                            userId: uid,
                            assignedById: user.sub,
                            isActive: true,
                        },
                    })
                )
                : []),

            ...(toDisable.length
                ? [
                    prisma.responseAssignment.deleteMany({
                        where: {
                            responseId,
                            userId: { in: toDisable },
                        },
                    }),
                ]
                : []),
        ]);

        return NextResponse.json(
            {
                success: true,
                message: "Response assignment updated successfully",
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