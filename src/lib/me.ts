"use server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { Role } from "../app/generated/prisma/enums";
const JWT_SECRET = process.env.JWT_SECRET!;

export async function getServerUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        return null;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            sub: string;
            accountId: string;
            role: Role;
        };
        return decoded
    } catch (error: any) {
        throw new Error(error.message)
    }
}

async function safeVerifyToken(token: string | null) {
    try {
        if (!token) return null;
        return await jwt.verify(token, JWT_SECRET) as {
            sub: string;
            accountId: string;
            role: Role;
        };
    } catch {
        return null;
    }
}