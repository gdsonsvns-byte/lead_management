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
        response: {
          form: {
            accountId: { not: null },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
            answers: {
              select: {
                value: true,
                field: {
                  select: { label: true },
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
    const latestFollowups = Array.from(latestMap.values());

    const validPendingFollowUps = latestFollowups.filter((fu) => {
      if (fu.status !== "PENDING") return false;
      if (!fu.nextFollowUpDate) return false;
      if (new Date(fu.nextFollowUpDate) > end) return false;
      return true;
    });

    if (validPendingFollowUps.length === 0) {
      console.log("No pending follow-ups for today or overdue.");
      return;
    }
    // group by account
    const grouped: Record<string, typeof validPendingFollowUps> = {};
    for (const fu of validPendingFollowUps) {
      const accountId = fu.response.form.account?.id;
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
      await delay(1000);
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
    console.log("✅ All Pending follow-up Email notifications sent Successfully");
  } catch (error) {
    console.log(error);
    throw new Error("Something went wrong...")
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPendingFollowupEmail({
  businessName,
  followups,
}: {
  businessName: string;
  followups: any[];
}) {
  const today = new Date().setHours(0, 0, 0, 0);

  const cards = followups
    .map((f, i) => {
      const answers = f.response.answers
        .map(
          (a: any) => `
            <tr>
              <td style="padding:6px 0; color:#6b7280; font-size:13px; width:40%;">
                ${a.field.label}
              </td>
              <td style="padding:6px 0; color:#111827; font-size:13px;">
                ${a.value || "-"}
              </td>
            </tr>
          `
        )
        .join("");

      const isOverdue =
        new Date(f.nextFollowUpDate).setHours(0, 0, 0, 0) < today;

      return `
        <div style="
          border:1px solid #e5e7eb;
          border-radius:10px;
          padding:16px;
          margin-bottom:16px;
          background:#ffffff;
        ">

          <!-- Header -->
          <div style="font-size:12px; color:#6b7280; margin-bottom:4px;">
            Follow-up #${i + 1}
          </div>

          <div style="font-size:16px; font-weight:bold; color:#111827; margin-bottom:8px;">
            Last Follow Up: <br> <span style="font-size:12px; font-weight:normal;"> ${f.type}</span> 
          </div>

          <div style="
            font-size:13px;
            color:#374151;
            margin-bottom:12px;
          ">
            <strong>Summary:</strong><br/>
            ${f.note || "-"}
            <br>
            <strong>Date:</strong>${new Date(f.createdAt).toLocaleString()}
          </div>

           <div style="
            font-size:13px;
            color:${isOverdue ? "#dc2626" : "#16a34a"};
            margin-bottom:10px;
          ">
          <strong style="color:#374151;"font-size:16px;>Next Follow up:</strong>
          <br>
            ${new Date(f.nextFollowUpDate).toDateString()}
            ${isOverdue ? " • Overdue" : ""}
            <br>
            <strong>Status:</strong> ${f.businessStatus}
          </div>

          <!-- Lead Details -->
          <table width="100%" cellpadding="0" cellspacing="0">
            ${answers}
          </table>

        </div>
      `;
    })
    .join("");

  return `
    <div style="background:#f3f4f6; padding:16px;">
      <div style="
        max-width:600px;
        margin:auto;
        background:#ffffff;
        border-radius:12px;
        padding:20px;
        font-family:Arial, sans-serif;
        color:#111827;
      ">

        <h2 style="margin-top:0; margin-bottom:8px;">
          Good Morning 👋
        </h2>

        <p style="font-size:14px; color:#374151; margin-bottom:16px;">
          You have <strong>${followups.length}</strong> pending follow-ups
          (including overdue) for <strong>${businessName}</strong>.
        </p>

        ${cards}

        <!-- CTA -->
        <div style="text-align:center; margin-top:24px;">
          <a
            href="https://leads.wizards.co.in"
            target="_blank"
            style="
              display:inline-block;
              background:#2563eb;
              color:#ffffff;
              text-decoration:none;
              padding:10px 16px;
              border-radius:6px;
              font-size:14px;
            "
          >
            Open Dashboard
          </a>
        </div>

        <p style="font-size:12px; color:#9ca3af; margin-top:20px;">
          This is an automated reminder. Please do not reply.
        </p>

      </div>
    </div>
  `;
}

