import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyApiAccessToken } from "@/src/lib/verifyApiAccessToken";
import { verifyRole } from "@/src/lib/verifyRole";
import { resetPasswordSchema } from "@/src/types/auth";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["ADMIN", "SUPERADMIN"])
        const apiClient = await verifyApiAccessToken(req);

        if (!user && !apiClient) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        let userId: string | null = null;
        if (user && (user.role === "ADMIN" || user.role === "SUPERADMIN")) {
            userId = user.sub;
        } else if (!user && apiClient) {
            userId = apiClient.adminId;
        }
        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        const { currentPassword, newPassword, confirmPassword } = await req.json()
        const pass = resetPasswordSchema.safeParse({ password: newPassword });

        if (!pass.success) {
            const flat = pass.error.flatten().fieldErrors;
            const firstError = Object.values(flat).flat()[0];

            return NextResponse.json(
                { error: firstError || "Invalid password" },
                { status: 400 }
            );
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: "All fields are required." },
                { status: 400 }
            );
        }
        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: "New password and confirm password do not match." },
                { status: 400 }
            );
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });
        if (!dbUser?.password) {
            return NextResponse.json(
                { error: "User record not found." },
                { status: 404 }
            );
        }
        const valid = await bcrypt.compare(currentPassword, dbUser.password);
        if (!valid) {
            return NextResponse.json(
                { error: "Incorrect old password" },
                { status: 401 }
            );
        }
        const isSamePassword = await bcrypt.compare(newPassword, dbUser.password);
        if (isSamePassword) {
            return NextResponse.json(
                { error: "New password cannot be the same as the old password." },
                { status: 400 }
            );
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return NextResponse.json(
            { success: true, message: "Password updated successfully." },
            { status: 200 }
        );

    } catch (err: any) {
        console.error("UPDATE PASSWORD ERROR:", err);
        return NextResponse.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}