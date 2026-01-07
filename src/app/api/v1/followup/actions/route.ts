import { FollowUpStatus } from "@/src/app/generated/prisma/enums";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextActionSchema } from "@/src/types/next_actions";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

// get all next action with formid
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
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const formId = searchParams.get("form_id");
        if (!formId) {
            return NextResponse.json(
                { error: "Form ID is required" },
                { status: 400 }
            );
        }

        const form = await prisma.form.findUnique({
            where: {
                id: formId,
            },
            select: {
                id: true,
                accountId: true,
                title: true,
                description: true,
            }
        });
        if (!form) {
            return NextResponse.json(
                { error: "Form not found" },
                { status: 404 }
            );
        }

        if (user?.role === "ADMIN" && user?.accountId !== form.accountId) {
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        } else if (!user && apiClient && apiClient.accountId !== form.accountId) {
            console.log(apiClient.accountId);
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const actions = await prisma.nextActionType.findMany({
            where: {
                formId: formId
            },
            select: {
                id: true,
                label: true,
                status: true,
                order: true,
                isDefault: true,
            },
            orderBy: {
                order: "asc",
            },
        });

        if (!actions) {
            return NextResponse.json(
                { error: "Actions not found" },
                { status: 404 }
            );
        }
        const response = {
            actions,
            title: form.title,
            description: form.description,
        }

        return NextResponse.json(response, { status: 200 });

    } catch (error: any) {
        console.error("Fetch FollowUps Actions Error:", error.message);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

//delete nextaction with their id
export async function DELETE(req: NextRequest) {
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
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { formId, ids } = body as {
            formId: string;
            ids: string[];
        };

        if (!formId) {
            return NextResponse.json(
                { error: "Form ID is required" },
                { status: 400 }
            );
        }

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: "At least one action id is required" },
                { status: 400 }
            );
        }

        const form = await prisma.form.findUnique({
            where: {
                id: formId,
            },
            select: {
                id: true,
                accountId: true,
            }
        });
        if (!form) {
            return NextResponse.json(
                { error: "Form not found" },
                { status: 404 }
            );
        }

        if (user?.role === "ADMIN" && user.accountId !== form.accountId) {
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }

        if (!user && apiClient && apiClient.accountId !== form.accountId) {
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }

        const result = await prisma.nextActionType.deleteMany({
            where: {
                id: { in: ids },
                formId: formId,
            },
        });

        return NextResponse.json(
            {
                success: true,
                deletedCount: result.count,
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error("Delete FollowUps Actions Error:", error.message);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

// creating new actions
// export async function POST(req: NextRequest) {
//     try {
//         const ip = req.headers.get("x-forwarded-for") || "unknown";
//         if (isRateLimited(ip)) {
//             return NextResponse.json(
//                 { error: "Too many requests. Try again later." },
//                 { status: 429 }
//             );
//         }

//         const user = await verifyRole(["SUPERADMIN", "ADMIN"]);
//         const apiClient = await verifyApiAccessToken(req);

//         if (!user && !apiClient) {
//             return NextResponse.json(
//                 { error: "Unauthorized User" },
//                 { status: 401 }
//             );
//         }

//         const body = await req.json();
//         const { success, data, error } = NextActionSchema.safeParse(body);

//         if (!success) {
//             return NextResponse.json(
//                 { error: z.prettifyError(error) },
//                 { status: 400 }
//             );
//         }

//         const form = await prisma.form.findUnique({
//             where: {
//                 id: data.formId,
//             },
//             select: {
//                 id: true,
//                 accountId: true,
//             }
//         });
//         if (!form) {
//             return NextResponse.json(
//                 { error: "Form not found" },
//                 { status: 404 }
//             );
//         }

//         if (user?.role === "ADMIN" && user.accountId !== form.accountId) {
//             return NextResponse.json(
//                 { error: "Unauthorized User" },
//                 { status: 401 }
//             );
//         }

//         if (!user && apiClient && apiClient.accountId !== form.accountId) {
//             return NextResponse.json(
//                 { error: "Unauthorized User" },
//                 { status: 401 }
//             );
//         }

//         const nextAction = await prisma.nextActionType.create({
//             data: {
//                 label: data.label,
//                 formId: data.formId,
//                 status: data.status,
//             },
//         });

//         return NextResponse.json(
//             {
//                 success: true,
//                 data: nextAction,
//             },
//             { status: 201 }
//         );
//     } catch (error: any) {
//         console.error("Creating FollowUps Actions Error:", error.message);
//         return NextResponse.json(
//             { error: "Internal Server Error" },
//             { status: 500 }
//         );
//     }
// }

// update actions
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
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const body = await req.json();
        const { success, data, error } = NextActionSchema.safeParse(body?.data);

        if (!success) {
            return NextResponse.json(
                { error: z.prettifyError(error) },
                { status: 400 }
            );
        }

        const { formId, actions } = data;

        const form = await prisma.form.findUnique({
            where: {
                id: formId,
            },
            include: {
                nextActions: true
            }
        });

        if (!form) {
            return NextResponse.json(
                { error: "Form not found" },
                { status: 404 }
            );
        }

        if (user?.role === "ADMIN" && user.accountId !== form.accountId) {
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }

        if (!user && apiClient && apiClient.accountId !== form.accountId) {
            return NextResponse.json(
                { error: "Unauthorized User" },
                { status: 401 }
            );
        }

        const incomingIds = actions.map((a) => a.id).filter((id): id is string => !!id && id.length > 0);
        const existingIds = form.nextActions.map((a) => a.id);
        const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

        await prisma.$transaction(async (tx) => {
            if (toDelete.length > 0) {
                await tx.nextActionType.deleteMany({
                    where: {
                        id: { in: toDelete },
                        formId,
                    },
                });
            }

            for (const a of actions) {
                if (a.id && a.id !== "") {
                    await tx.nextActionType.update({
                        where: { id: a.id },
                        data: {
                            order: a.order,
                        },
                    });
                }
            }

            const newActions = actions.filter(
                (a) => !a.id || a.id === ""
            );

            if (newActions.length > 0) {
                await tx.nextActionType.createMany({
                    data: newActions.map((a, idx) => ({
                        formId,
                        label: a.label.trim(),
                        status: a.status,
                        isDefault: a.isDefault ?? true,
                        order:
                            a.order ??
                            form.nextActions.length + idx + 1,
                    })),
                });
            }
        });

        return NextResponse.json(
            { success: true },
            { status: 200 }
        );
    } catch (err: any) {
        console.error("PATCH /next-actions error:", err);
        return NextResponse.json(
            { error: "Failed to update next actions" },
            { status: 500 }
        );
    }
}
