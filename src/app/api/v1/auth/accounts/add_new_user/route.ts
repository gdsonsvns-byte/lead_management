import { generatePassword } from "@/src/lib/generatePassword";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { sendLoginDetails } from "@/src/lib/sendPasswordMail";
import { verifyRole } from "@/src/lib/verifyRole";
import { newUserSchema } from "@/src/types/auth";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";


export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }
        const creator = await verifyRole(["SUPERADMIN", "ADMIN"]);
        if (!creator) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contentLength = Number(req.headers.get("content-length") || 0);
        if (contentLength > 50_000) {
            return NextResponse.json({ error: "Payload too large" }, { status: 413 });
        }

        const body = await req.json();
        const parsed = newUserSchema.omit({ password: true }).safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: z.prettifyError(parsed.error) },
                { status: 400 }
            );
        }
        const { name, email, role } = parsed.data;
        const simpleEmail = email.toLowerCase().trim();

        let accountId: string | undefined;
        let createdById: string = creator.sub;

        const { searchParams } = new URL(req.url);
        const accountIdFromQuery = searchParams.get("account_id");

        if (creator.role === "SUPERADMIN") {

            if (!accountIdFromQuery) {
                return NextResponse.json(
                    { error: "account_id is required for SUPERADMIN" },
                    { status: 400 }
                );
            }

            const accountAdmin = await prisma.user.findFirst({
                where: {
                    accountId: accountIdFromQuery,
                    role: "ADMIN",
                },
                select: { id: true, accountId: true },
            });

            if (!accountAdmin) {
                return NextResponse.json(
                    { error: "Account admin not found" },
                    { status: 400 }
                );
            }

            accountId = accountAdmin.accountId;
            createdById = accountAdmin.id;
        } else {
            accountId = creator.accountId;
            createdById = creator.sub;
        }

        if (!accountId) {
            return NextResponse.json(
                { error: "Account ID could not be determined" },
                { status: 400 }
            );
        }


        const [user, account] = await Promise.all([
            prisma.user.findUnique({ where: { email: simpleEmail } }),
            prisma.account.findUnique({ where: { email: simpleEmail } }),
        ]);

        if (user || account) {
            return NextResponse.json(
                { error: "Email already in use" },
                { status: 409 }
            );
        }


        const generatedPassword = generatePassword(10);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email: simpleEmail,
                password: hashedPassword,
                role,
                accountId,
                createdById,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                accountId: true,
                createdAt: true,
            },
        });

        if (!newUser) {
            return NextResponse.json({ error: "Can't create the user" }, { status: 500 });
        }

        try {
            await sendLoginDetails(simpleEmail, newUser.name, generatedPassword);
        } catch (mailError) {
            console.error("Login email failed:", mailError);
        }

        return NextResponse.json(
            {
                success: true,
                message: "User created successfully",
                user: newUser,
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(
            { error: error.message || "Failed to create form" },
            { status: 500 }
        )
    }
}