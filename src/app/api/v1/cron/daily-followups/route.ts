import { sendDailyPendingFollowups } from "@/src/lib/sendDailyPendingFollowups";

export async function GET(req: Request) {
    const secret = req.headers.get("x-cron-secret");
    if (secret !== process.env.CRON_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }

    await sendDailyPendingFollowups();
    return Response.json({ success: true });
}
