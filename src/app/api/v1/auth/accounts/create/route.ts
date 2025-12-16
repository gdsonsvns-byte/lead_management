import { isRateLimited } from "@/src/lib/limiter"
import prisma from "@/src/lib/prisma"
import { createAccountUserSchema } from "@/src/types/auth"
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from "next/server"
import { generatePassword } from "@/src/lib/generatePassword";
import { sendLoginDetails } from "@/src/lib/sendPasswordMail"
import { verifyRole } from "@/src/lib/verifyRole"


export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown"
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many login attempts. Try again later." },
                { status: 429 }
            )
        }

        const isSuperAdmin = await verifyRole("SUPERADMIN")
        if (!isSuperAdmin) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const ct = req.headers.get('content-type') || ''
        let body: any
        if (ct.includes("application/json")) {
            body = await req.json();
        } else if (ct.includes("form")) {
            const form = await req.formData();
            body = Object.fromEntries(form.entries());
        } else {
            return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
        }

        const parsed = createAccountUserSchema
            .omit({ password: true })
            .safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        const data = parsed.data;
        const email = data.email.toLowerCase().trim();
        
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return NextResponse.json(
                { error: "Email already exists" },
                { status: 409 }
            );
        }

        const existingAccount = await prisma.account.findUnique({
            where: { email }
        });
        if (existingAccount) {
            return NextResponse.json({ error: "Account with this email already exists" }, { status: 409 });
        }

        const generatedPassword = generatePassword(10);
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        const newAccount = await prisma.account.create({
            data: {
                businessName: data.businessName,
                phone: data.phone,
                location: data.location,
                email,
                whatsappApiKey: data.whatsappApiKey,
                users: {
                    create: {
                        name: data.name,
                        email,
                        password: hashedPassword,
                        role: "ADMIN",
                        createdById: isSuperAdmin.id,
                    },
                },
            },
            include: { users: true },
        });

        if (!newAccount) {
            return NextResponse.json({ error: "Can't create the user" }, { status: 500 });
        }

        const isMailsent = await sendLoginDetails(email, data.name, generatedPassword);
        if (!isMailsent) {
            return NextResponse.json({ error: "Can't send the login details email to user" }, { status: 500 });
        }
        return NextResponse.json(
            {
                success: true,
                message: "Account & User created. Credentials sent to email.",
            },
            { status: 201 }
        );

    } catch (err: any) {
        console.error("Error creating account:", err);
        return NextResponse.json(
            { error: err.message || "Something went wrong" },
            { status: 500 }
        );
    }
}