import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";

export async function getAuthUser() {
    try {
        const user = await verifyRole(["SUPERADMIN", "ADMIN"]);
        if (!user) return null;

        const dbUser = await prisma.user.findFirst({
            where: { id: user.sub },
            select: {
                id: true,
                name: true,
                email: true,
                account: true,
                accountId: true,
            },
        });

        if (!dbUser) return null;

        return {
            ...dbUser,
            initials: generateNameInitials(dbUser.name),
        };
    } catch (error: any) {
        return null;
    }
}

function generateNameInitials(name?: string | null): string {
    if (!name || !name.trim()) return "";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return first + last;
}