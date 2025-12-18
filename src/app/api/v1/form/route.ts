import { NextResponse } from "next/server"
import { createFormSchema } from "@/src/types/form"
import slugify from "slugify"
import { isRateLimited } from "@/src/lib/limiter"
import { verifyRole } from "@/src/lib/verifyRole"
import prisma from "@/src/lib/prisma"

// get all form associted with Account
export async function GET(req: Request) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["ADMIN", "SUPERADMIN"])
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

        const account = await prisma.user.findUnique({
            where: { id: user.id },
            select: { accountId: true }
        });

        if (!account?.accountId && queryAccountId === "") {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }

        const finalAccountId = queryAccountId !== "" ? queryAccountId : account?.accountId;

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
export async function POST(req: Request) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["SUPERADMIN", "ADMIN"]);
        const contentLength = Number(req.headers.get("content-length") || 0);
        if (contentLength > 50_000) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        const { searchParams } = new URL(req.url);
        const targetAccountIdFromQuery = searchParams.get("account_id");

        const body = await req.json();

        const userAccount = await prisma.user.findUnique({
            where: { id: user.id },
            select: { accountId: true, role: true, name: true }
        });

        if (!userAccount?.accountId) {
            return NextResponse.json({ error: "User account not found" }, { status: 404 });
        }

        let formOwnerUserId = user.id;
        let formOwnerAccountId = userAccount.accountId;
        let formOwnerName = userAccount.name;

        if (user.role === "SUPERADMIN") {
            if (!targetAccountIdFromQuery || typeof targetAccountIdFromQuery !== "string") {
                return NextResponse.json(
                    { error: "SUPERADMIN must send account_id in searchParams" },
                    { status: 400 }
                );
            }

            const targetAccount = await prisma.account.findUnique({
                where: { id: targetAccountIdFromQuery }
            });

            if (!targetAccount) {
                return NextResponse.json(
                    { error: "Target account does not exist" },
                    { status: 404 }
                );
            }

            const firstUser = await prisma.user.findFirst({
                where: { accountId: targetAccountIdFromQuery },
                select: { id: true, name: true, accountId: true }
            });

            if (!firstUser) {
                return NextResponse.json(
                    { error: "No users found inside this account" },
                    { status: 404 }
                );
            }

            formOwnerUserId = firstUser.id;
            formOwnerAccountId = targetAccountIdFromQuery;
            formOwnerName = firstUser.name;
        }

        const parsed = createFormSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { title, description, fields } = parsed.data;
        const rawAdmin = body.adminCampaign;
        const rawUser = body.userCampaign;

        const adminCampaign = typeof rawAdmin === "string" ? rawAdmin.trim() : null;
        const userCampaign = typeof rawUser === "string" ? rawUser.trim() : null;

        if (adminCampaign && adminCampaign.length > 100) {
            return NextResponse.json(
                { error: "Admin campaign name too long. Max 100 chars." },
                { status: 400 }
            );
        }

        if (userCampaign && userCampaign.length > 100) {
            return NextResponse.json(
                { error: "User campaign name too long. Max 100 chars." },
                { status: 400 }
            );
        }
        const cleanTitle = title.trim();
        const cleanDescription = description?.trim() || "";

        const slugBase = slugify(cleanTitle, { lower: true, strict: true });
        const slug = `${slugBase}-${Date.now()}`;

        const existing = await prisma.form.findFirst({
            where: {
                title: cleanTitle,
                accountId: formOwnerAccountId
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: "A form with this title already exists for this account" },
                { status: 400 }
            );
        }

        const prefix = (formOwnerName || "FORM").slice(0, 4).toUpperCase();
        const formCount = await prisma.form.count({
            where: { accountId: formOwnerAccountId }
        });
        const formattedCount = String(formCount + 1).padStart(4, "0");
        const datePart = new Date().toISOString();
        const uniqueId = `${prefix}-${formattedCount}-${datePart}`;

        const result = await prisma.$transaction(async (tx) => {
            return tx.form.create({
                data: {
                    title: cleanTitle,
                    description: cleanDescription,
                    formsId: uniqueId,
                    slug,
                    userId: formOwnerUserId,
                    accountId: formOwnerAccountId,
                    adminWhatsappCampaignName: adminCampaign ?? null,
                    userWhatsappCampaignName: userCampaign ?? null,
                    fields: {
                        create: fields?.map((f, idx) => ({
                            label: f.label.trim(),
                            type: f.type,
                            required: f.required ?? false,
                            options: f.options ? JSON.stringify(f.options) : undefined,
                            order: f.order ?? idx + 1,
                        })) || [],
                    },
                },
                include: { fields: true },
            });
        });

        return NextResponse.json(
            { success: true, form: result },
            { status: 201 }
        );

    } catch (err: any) {
        console.error("POST /form error:", err);
        return NextResponse.json(
            { error: err.message || "Failed to create form" },
            { status: 500 }
        );
    }
}

