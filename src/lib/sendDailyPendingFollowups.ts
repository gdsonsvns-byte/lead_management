import prisma from "@/src/lib/prisma";
import { sendPendingFollowupEmail } from "./sendPendingFollowup";

export async function sendDailyPendingFollowups() {
    try {
        const today = new Date();
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);

        const end = new Date(today);
        end.setHours(23, 59, 59, 999);


        const followUps = await prisma.followUp.findMany({
            where: {
                status: "PENDING",
                nextFollowUpDate: {
                    gte: start,
                    lte: end,
                },
                response: {
                    form: {
                        accountId: { not: null },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            include: {
                response: {
                    include: {
                        form: {
                            include: {
                                account: {
                                    select: {
                                        id: true,
                                        businessName: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (followUps.length === 0) {
            console.log("No pending follow-ups for today. No emails sent.");
            return;
        }
        // latest followup per response
        const latestMap = new Map<string, typeof followUps[0]>();
        for (const fu of followUps) {
            if (!latestMap.has(fu.responseId)) {
                latestMap.set(fu.responseId, fu);
            }
        }

        // group by account
        const grouped: Record<string, typeof followUps> = {};
        for (const fu of latestMap.values()) {
            const accountId = fu.response.form.account?.id
            if (!accountId) continue;
            grouped[accountId] ??= [];
            grouped[accountId].push(fu);
        }

        for (const followups of Object.values(grouped)) {
            if (followups.length === 0) continue;
            const account = followups[0].response.form.account;
            if (!account?.email) continue;

            const html = buildPendingFollowupEmail({
                businessName: account.businessName ?? "Your Business",
                followups,
            });

            await sendPendingFollowupEmail({
                to: account.email,
                subject: `All Pending Follow-ups for ${today.toDateString()} of ${account.businessName}`,
                html,
            });
        }

        // send WhatsApp per account
        //   for (const followups of Object.values(grouped)) {
        //     const account = followups[0].response.form.account;
        //     const admins = account.users.filter(
        //       u => u.role === "ADMIN" || u.role === "SUPERADMIN"
        //     );

        //     const phones = admins
        //       .map(a => a.phone)
        //       .filter(Boolean)
        //       .map(p => p!.startsWith("91") ? p! : "91" + p);

        //     const messageLines = followups.map(
        //       (f, i) =>
        //         `${i + 1}. ${f.businessStatus} | ${f.nextFollowUpDate?.toDateString()}`
        //     );

        //     const params = [
        //       account.businessName || "Your Account",
        //       String(followups.length),
        //       messageLines.join("\n"),
        //     ];

        //     for (const phone of phones) {
        //       await sendAiSensyMessage({
        //         destination: phone,
        //         userName: "Admin",
        //         templateParams: params,
        //         tags: ["daily_followup"],
        //       });
        //     }
        //   }
        console.log("✅ Daily follow-up WhatsApp notifications sent");
    } catch (error) {
        console.log(error);
        throw new Error("Something went wrong...")
    }
}

function buildPendingFollowupEmail({ businessName, followups }: { businessName: string; followups: any[] }) {
    const rows = followups
        .map(
            (f, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${f.businessStatus}</td>
          <td>${f.nextFollowUpDate?.toDateString()}</td>
        </tr>
      `
        )
        .join("");

    return `
    <h2>Good Morning 👋</h2>
    <p>
      You have <strong>${followups.length}</strong> pending follow-ups today
      for <b>${businessName}</b>.
    </p>

    <table border="1" cellpadding="8" cellspacing="0">
      <thead>
        <tr>
          <th>#</th>
          <th>Status</th>
          <th>Follow-up Date</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <p>Please log in to your dashboard to take action.</p>
  `;
}