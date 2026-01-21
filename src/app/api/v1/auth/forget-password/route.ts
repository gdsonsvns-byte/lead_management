import { NextResponse } from "next/server";
import { generateResetJwt } from "@/src/lib/resetJwt";
import { SendPasswordResetEmail } from "@/src/lib/sendPasswordResetEmail";
import prisma from "@/src/lib/prisma";
import { forgetPasswordEMail } from "@/src/types/auth";
import { isRateLimited } from "@/src/lib/limiter";
import z from "zod";

export async function POST(req: Request) {

    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const { email } = await req.json();
        const validEmail = forgetPasswordEMail.safeParse({ email: email })
        if (!validEmail.success) {
            return NextResponse.json(
                { error: z.prettifyError(validEmail.error) || "Invalid email" },
                { status: 400 }
            );
        }
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return NextResponse.json({ error: "Invalid email." }, { status: 404 });
        }
        const token = generateResetJwt(user.id);
        await prisma.user.update({
            where: { email },
            data: {
                resetToken: token,
                resetTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 15)
            }
        });
        const msg = await SendPasswordResetEmail(email, token);

        return NextResponse.json({ message: msg }, { status: 200 });
    } catch (error) {
        console.log(error);
    }
}
