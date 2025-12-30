"use server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
const JWT_SECRET = process.env.JWT_SECRET!;

export interface AuthContext {
    sub: string;
    accountId: string;
    role: string;
}
interface DecodedUser {
    sub: string;
    accountId: string;
    role: "ADMIN" | "SUPERADMIN" | "MANAGER";
}

export async function verifyRole(allowedRoles: string[] | string): Promise<AuthContext | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        return null;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as DecodedUser;

        const roles = Array.isArray(allowedRoles)
            ? allowedRoles
            : [allowedRoles];

        if (!roles.includes(decoded.role)) {
            return null;
        }

        return decoded;
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            throw new Error("Session expired. Please log in again.");
        }

        if (err.name === "JsonWebTokenError") {
            throw new Error("Invalid token. Authentication failed.");
        }
        return null;
    }
}
