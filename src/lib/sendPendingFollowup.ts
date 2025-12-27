import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Props {
    to: string;
    subject: string
    html: string;
}
export async function sendPendingFollowupEmail({ to, subject, html }: Props) {
    try {
        if (!to) {
            console.warn("⚠️ User email missing. Skipping user email.");
            return { success: false, skipped: true };
        }

        const { error } = await resend.emails.send({
            from: 'New Lead <leads@wizards.co.in>',
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("❌ Failed to send alert email:", error);
            return { success: false, error };
        }

        return { success: true, message: "Alert email sent successfully" };

    } catch (err: any) {
        console.error("❌ Unexpected email error:", err);
        return { success: false, error: err.message };
    }
}