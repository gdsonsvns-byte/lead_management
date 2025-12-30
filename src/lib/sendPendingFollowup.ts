import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Props {
    to: string;
    subject: string
    html: string;
}
export async function sendPendingFollowupEmail({ to, subject, html }: Props, retries = 3) {
    try {
        if (!to) {
            console.warn("⚠️ User email missing. Skipping user email.");
            return { success: false, skipped: true };
        }

        const { error } = await resend.emails.send({
            from: 'Pending Follow Up <leads@wizards.co.in>',
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            if (error.statusCode === 429 && retries > 0) {
                const wait = (4 - retries) * 1000;
                console.warn(`⏳ Rate limited. Retrying in ${wait}ms`);
                await delay(wait);
                return sendPendingFollowupEmail({ to, subject, html }, retries - 1);
            }

            console.error("❌ Email failed:", error);
            return { success: false };
        }

        return { success: true, message: "Alert email sent successfully" };

    } catch (err: any) {
        console.error("❌ Unexpected email error:", err);
        return { success: false, error: err.message };
    }
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}