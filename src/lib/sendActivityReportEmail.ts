import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface Props {
    to: string;
    subject: string
    html: string;
}
export async function sendActivityReportEmail(
    { to, subject, html }: Props,
    retries = 3
) {
    try {
        const { error } = await resend.emails.send({
            from: "Activity Report <leads@wizards.co.in>",
            to: [to],
            subject,
            html,
        });

        if (error) {
            if (error.statusCode === 429 && retries > 0) {
                const wait = (4 - retries) * 1000;
                console.warn(`⏳ Rate limited. Retrying in ${wait}ms`);
                await delay(wait);
                return sendActivityReportEmail({ to, subject, html }, retries - 1);
            }

            console.error("❌ Email failed:", error);
            return { success: false };
        }

        return { success: true };

    } catch (err: any) {
        console.error("❌ Unexpected error:", err);
        return { success: false, error: err.message };
    }
}
function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}