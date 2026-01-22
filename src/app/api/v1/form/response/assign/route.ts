import { isRateLimited } from "@/src/lib/limiter";
import prisma from "@/src/lib/prisma";
import { verifyRole } from "@/src/lib/verifyRole";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { form_id, response_id, user_id } = body;

        if (!form_id || !response_id || !user_id) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const assignUser = await prisma.responseAssignment.upsert({
            where: {
                responseId_userId: {
                    responseId: response_id,
                    userId: user_id,
                },
            },
            update: { isActive: true },
            create: {
                responseId: response_id,
                userId: user_id,
                assignedById: user?.sub ?? null,
                isActive: true,
            },
        });

        return NextResponse.json({
            message: "User assigned successfully",
            assignUser,
        }, { status: 200 });

    } catch (error: any) {
        console.log("Something went wrong", error.message);
        return NextResponse.json({
            error: error.message || "Something went wrong"
        }, { status: 500 })
    };
}