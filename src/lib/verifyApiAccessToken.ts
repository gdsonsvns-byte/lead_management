import { NextRequest } from "next/server";
import prisma from "./prisma";
import { hashToken } from "./generate_access_token";

export async function verifyApiAccessToken(req: NextRequest) {
    const auth = req.headers.get("authorization");

    if (!auth || !auth.startsWith("Bearer ")) {
        return null;
    }

    const rawToken = auth.replace("Bearer ", "").trim();
    const tokenHash = hashToken(rawToken);

    const token = await prisma.apiAccessToken.findUnique({
        where: { tokenHash },
        include: {
            account: {
                select: {
                    id: true,
                    users: {
                        where: {
                            role: "ADMIN"
                        },
                        select: {
                            name: true,
                            id: true,
                            role: true,
                        }
                    }
                }
            }
        },
    });

    if (!token) return null;
    if (token.isRevoked) return null;
    // if (token.expiresAt && token.expiresAt < new Date()) return null;
    await prisma.apiAccessToken.update({
        where: { id: token.id },
        data: { lastUsedAt: new Date() },
    });

    return {
        accountId: token.account.id,
        tokenId: token.id,
        adminId: token.account.users[0].id,
        adminRole: token.account.users[0].role,
        adminName: token.account.users[0].name,
    };
}
