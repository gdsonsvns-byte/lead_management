import { NextRequest, NextResponse } from "next/server"
import { createFormSchema } from "@/src/types/form"
import slugify from "slugify"
import { isRateLimited } from "@/src/lib/limiter"
import { verifyRole } from "@/src/lib/verifyRole"
import prisma from "@/src/lib/prisma"
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken"
import { DEFAULT_NEXT_ACTIONS } from "@/src/constants/actions"
import { FollowUpStatus } from "@/src/app/generated/prisma/enums"

// get all form associted with Account
export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["ADMIN", "SUPERADMIN", "MANAGER"])
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json({ error: "Unauthorized User" }, { status: 401 });
        }
        const accountId = user?.accountId || apiClient?.accountId;
        const { searchParams } = new URL(req.url);
        const page = Math.max(Number(searchParams.get("page")) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 50);
        const skip = (page - 1) * limit;
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

        if (!accountId && queryAccountId === "") {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }

        const finalAccountId = queryAccountId !== "" ? queryAccountId : accountId;

        const forms = await prisma.form.findMany({
            where: { accountId: finalAccountId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                formsId: true,
                userId: true,
                title: true,
                description: true,
                slug: true,
                createdAt: true,
                adminWhatsappCampaignName: true,
                userWhatsappCampaignName: true,
                accountId: true,
                _count: {
                    select: {
                        fields: true,
                    },
                },
            },
        });

        const totalForm = await prisma.form.count({
            where: { accountId: finalAccountId }
        });

        if (forms.length === 0) {
            return NextResponse.json(
                { message: "No forms found. Please create one now." },
                { status: 200 }
            );
        }
        const pageCount = Math.ceil(totalForm / limit);
        const response = {
            forms,
            page,
            limit,
            totalForm,
            pageCount,
            hasMore: page < pageCount,
            nextPage: page < pageCount ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null,
        };
        return NextResponse.json({ response }, { status: 200 })
    } catch (err: any) {
        console.error(err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
// create form 
export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests" },
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
        const contentLength = Number(req.headers.get("content-length") || 0);
        if (contentLength > 50_000) {
            return NextResponse.json(
                { error: "Payload too large" },
                { status: 413 }
            );
        }
        const body = await req.json();
        const parsed = createFormSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { title, description, fields } = parsed.data;
        let accountId: string;
        let adminId: string;
        let adminName: string;
        let superAdminId: string | null = null;

        if (user) {
            if (user.role === "SUPERADMIN") {
                const targetAccountId =
                    new URL(req.url).searchParams.get("account_id");

                if (!targetAccountId) {
                    return NextResponse.json(
                        { error: "SUPERADMIN must provide account_id" },
                        { status: 400 }
                    );
                }

                const accountExists = await prisma.account.findUnique({
                    where: { id: targetAccountId },
                    select: { id: true, users: { where: { role: "ADMIN" }, select: { id: true, name: true, role: true } } },
                });

                if (!accountExists) {
                    return NextResponse.json(
                        { error: "Account not found" },
                        { status: 404 }
                    );
                }

                accountId = targetAccountId;
                adminId = accountExists.users[0].id;
                adminName = accountExists.users[0].name;
                superAdminId = user.sub
            } else {
                const [accounts, superAdmin] = await Promise.all([
                    await prisma.account.findUnique({
                        where: { id: user.accountId },
                        select: { id: true, users: { where: { role: "ADMIN" }, select: { id: true, name: true } } },
                    }),
                    await prisma.user.findFirst({ where: { role: "SUPERADMIN" } })
                ])
                if (!accounts || !superAdmin) {
                    return NextResponse.json({ error: "Account Not Found" }, { status: 400 })
                }
                accountId = user.accountId;
                adminId = accounts.users[0].id;
                adminName = accounts.users[0].name;
                superAdminId = superAdmin.id
            }
        } else {
            const superAdmin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } })
            if (!superAdmin) {
                return NextResponse.json({ error: "Superadmin Account Not Found" }, { status: 400 })
            }
            accountId = apiClient?.accountId!;
            adminId = apiClient?.adminId!;
            adminName = apiClient?.adminName!;
            superAdminId = superAdmin.id
        }

        const rawAdmin = body.adminCampaign;
        const rawUser = body.userCampaign;
        const adminCampaign = typeof rawAdmin === "string" ? rawAdmin.trim() : null;
        const userCampaign = typeof rawUser === "string" ? rawUser.trim() : null;

        if (adminCampaign && adminCampaign.length > 100) {
            return NextResponse.json(
                { error: "Admin campaign name too long. Max 100 chars." }, { status: 400 }
            );
        }

        if (userCampaign && userCampaign.length > 100) {
            return NextResponse.json(
                { error: "User campaign name too long. Max 100 chars." }, { status: 400 }
            )
        }

        const cleanTitle = title.trim();
        const cleanDescription = description?.trim() || "";

        const slug =
            `${slugify(cleanTitle, { lower: true, strict: true })}-${Date.now()}`;

        const existing = await prisma.form.findFirst({
            where: { title: cleanTitle, accountId },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Form with this title already exists" },
                { status: 400 }
            );
        }

        const count = await prisma.form.count({ where: { accountId } });
        const prefix = (adminName || "FORM").slice(0, 4).toUpperCase();
        const formsId = `${prefix}-${String(count + 1).padStart(4, "0")}-${new Date().toDateString().split(" ").join("-")}`;

        const form = await prisma.$transaction(async (tx) => {
            const createdForm = await tx.form.create({
                data: {
                    title: cleanTitle,
                    description: cleanDescription,
                    slug,
                    formsId,
                    userId: adminId,
                    accountId,
                    adminWhatsappCampaignName: adminCampaign ?? null,
                    userWhatsappCampaignName: userCampaign ?? null,
                    fields: {
                        create: fields?.map((f, idx) => ({
                            label: f.label.trim(),
                            type: f.type,
                            required: f.required ?? false,
                            options: f.options ? JSON.stringify(f.options) : undefined,
                            order: f.order ?? idx + 1,
                        })),
                    },
                },
            });

            const accessUsers = [
                { formId: createdForm.id, userId: adminId },
                superAdminId && { formId: createdForm.id, userId: superAdminId },
            ].filter(Boolean) as { formId: string; userId: string }[];

            await tx.formAccess.createMany({
                data: accessUsers,
                skipDuplicates: true,
            });


            if (DEFAULT_NEXT_ACTIONS?.length) {
                await tx.nextActionType.createMany({
                    data: DEFAULT_NEXT_ACTIONS.map((a) => ({
                        label: a.label,
                        status: a.status as FollowUpStatus,
                        formId: createdForm.id,
                        order: a.order,
                        isDefault: true,
                    })),
                    skipDuplicates: true,
                });
            }
            
            return createdForm;
        });

        return NextResponse.json(
            {
                success: true,
                createdVia: user
                    ? user.role === "SUPERADMIN"
                        ? "SUPERADMIN"
                        : "ADMIN"
                    : "API",
                form,
            },
            { status: 201 }
        );

    } catch (err: any) {
        console.error("POST /form error:", err);
        return NextResponse.json(
            { error: "Failed to create form" },
            { status: 500 }
        );
    }
}

