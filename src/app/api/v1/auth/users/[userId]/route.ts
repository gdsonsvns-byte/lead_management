import { Role } from "@/src/app/generated/prisma/enums";
import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["SUPERADMIN", "ADMIN"]);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId } = await params;
        if (!userId?.trim()) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }

        const deleteWhere: { id: string; accountId?: string } = {
            id: userId,
        };

        if (user.role === "ADMIN") {
            deleteWhere.accountId = user.accountId;
        }
        const result = await prisma.user.delete({
            where: deleteWhere,
        });

        if (!result) {
            return NextResponse.json(
                {
                    error: "User not found or permission denied",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, message: "User deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many requests. Try again later." },
                { status: 429 }
            );
        }

        const user = await verifyRole(["SUPERADMIN", "ADMIN"]);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const queryAccountId = searchParams.get("account_id")?.trim() || "";
        let accountId = user && user.role === "SUPERADMIN" ? queryAccountId : user.accountId

        if (user.role === "SUPERADMIN" && !queryAccountId) {
            return NextResponse.json(
                { error: "Account not found." },
                { status: 404 }
            );
        }

        const { userId } = await params;
        if (!userId?.trim()) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }

        const body = await req.json();
        const { role } = body as { role?: Role };
console.log(userId,role,accountId);

        if (!role) {
            return NextResponse.json(
                { error: "Role is required" },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                id: userId,
                accountId,
            },
        });

        if (!existingUser) {
            return NextResponse.json(
                { error: "User not found or permission denied" },
                { status: 404 }
            );
        }

        if (existingUser.role === role) {
            return NextResponse.json(
                { error: "Same role will not be assign again." },
                { status: 403 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
        });

        return NextResponse.json(
            {
                success: true,
                message: "User role updated successfully",
            },
            { status: 200 }
        );

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Failed to Update user" }, { status: 500 });
    }
}