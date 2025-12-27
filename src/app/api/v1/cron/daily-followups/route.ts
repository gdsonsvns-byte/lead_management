import { sendDailyPendingFollowups } from "@/src/lib/sendDailyPendingFollowups";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  await sendDailyPendingFollowups();  
  return Response.json({ success: true });
}
