import prisma from "@/src/lib/prisma";
import { sendActivityReportEmail } from "@/src/lib/sendActivityReportEmail";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get("secret");
        if (secret !== process.env.CRON_SECRET) {
            return new Response("Unauthorized", { status: 401 });
        }
        const today = new Date().toISOString().split("T")[0];
        // const today = "2025-12-27";
        const { start, end } = getDayRange(today);
        const followUps = await prisma.followUp.findMany({
            where: {
                createdAt: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                id: true,
                type: true,
                status: true,
                note: true,
                nextFollowUpDate: true,
                createdAt: true,
                addedBy: {
                    select: {
                        name: true,
                    },
                },
                response: {
                    select: {
                        id: true,
                        form: {
                            select: {
                                account: {
                                    select: {
                                        businessName: true,
                                        email: true,
                                        id: true,
                                    }
                                }
                            },
                        },
                        answers: {
                            select: {
                                value: true,
                                field: {
                                    select: {
                                        label: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            }
        });

        if (followUps.length === 0) {
            console.log("No activity found for today.");
            return NextResponse.json({ message: "No activity found for today." }, { status: 200 });
        }

        const grouped: Record<string, typeof followUps> = {};
        for (const fu of followUps) {
            const account = fu.response?.form?.account;
            const accountId = account?.id;

            if (!accountId) continue;

            grouped[accountId] ??= [];
            grouped[accountId].push(fu);
        }

        for (const followups of Object.values(grouped)) {
            if (followups.length === 0) continue;

            const account = followups[0].response.form.account;
            if (!account?.email) continue;

            const html = buildActivityReportEmail({
                businessName: account.businessName ?? "Your Business",
                followups,
            });

            await sendActivityReportEmail({
                to: account.email,
                subject: `Activity report for ${today} – ${account.businessName}`,
                html,
            });
        }

        console.log("✅ All activity report Email notifications sent Successfully");
        return NextResponse.json({ message: "All activity report Email notifications sent Successfully" },
            { status: 200 });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function getDayRange(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);
    return { start, end };
}

function buildActivityReportEmail({
    businessName,
    followups,
}: {
    businessName: string;
    followups: any[];
}) {
    return `
  <div style="max-width:600px;margin:0 auto;padding:16px;">
    <h2 style="font-family:Arial;color:#111827;">
      Daily Activity Report – ${businessName}
    </h2>

    ${followups.map(renderFollowUpCard).join("")}
  </div>
  `;
}
function renderFollowUpCard(followUp: any) {
    const createdAt = new Date(followUp.createdAt).toLocaleString();
    const nextFollowUp = followUp.nextFollowUpDate
        ? new Date(followUp.nextFollowUpDate).toDateString()
        : "-";

    const statusBg =
        followUp.status === "PENDING" ? "#FEF3C7" : "#DCFCE7";
    const statusColor =
        followUp.status === "PENDING" ? "#92400E" : "#166534";

    return `
  <table width="100%" cellpadding="0" cellspacing="0" style="
    background:#ffffff;
    border:1px solid #e5e7eb;
    border-radius:12px;
    padding:16px;
    margin-bottom:16px;
    font-family:Arial, sans-serif;
  ">
    <!-- Header -->
    <tr>
      <td>
        <table width="100%">
          <tr>
            <td style="font-size:13px;color:#374151;">
              📅 ${createdAt}
            </td>
            <td align="right">
              <span style="
                background:${statusBg};
                color:${statusColor};
                padding:4px 10px;
                border-radius:999px;
                font-size:12px;
                font-weight:600;
                display:inline-block;
              ">
                ${followUp.status}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Type -->
    <tr>
      <td style="padding-top:8px;font-size:13px;color:#4b5563;">
        ✉️ ${followUp.type.replace("_", " ")}
      </td>
    </tr>

    <!-- Note -->
    ${followUp.note
            ? `
    <tr>
      <td style="padding-top:8px;font-size:14px;color:#374151;">
        📝 ${followUp.note}
      </td>
    </tr>
    `
            : ""
        }

    <!-- Answers -->
    <tr>
      <td style="padding-top:12px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${followUp.response.answers
            .map(
                (ans: any) => `
            <tr>
              <td style="padding-bottom:8px;">
                <div style="font-size:11px;color:#6b7280;">
                  ${ans.field.label}
                </div>
                <div style="font-size:14px;color:#111827;font-weight:600;">
                  ${ans.value || "-"}
                </div>
              </td>
            </tr>
          `
            )
            .join("")}
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding-top:12px;border-top:1px solid #e5e7eb;">
        <table width="100%">
          <tr>
            <td style="font-size:12px;color:#6b7280;">
              Added by: ${followUp.addedBy.name}
            </td>
            <td align="right" style="font-size:12px;color:#6b7280;">
              ⏰ Follow-up
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Next Follow-up -->
    <tr>
      <td style="padding-top:6px;">
        <table width="100%">
          <tr>
            <td style="font-size:12px;color:#6b7280;">
              Next Follow-up
            </td>
            <td align="right" style="font-size:12px;color:#374151;">
              📆 ${nextFollowUp}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
}
