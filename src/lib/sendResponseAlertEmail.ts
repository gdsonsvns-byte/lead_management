import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResponseAlertEmail({ userEmail, allFields, accountName, formName }: Props) {
    try {
        if (!userEmail) {
            console.warn("⚠️ User email missing. Skipping user email.");
            return { success: false, skipped: true };
        }
        const fieldsHtml = allFields.length
            ? `<ul style="padding-left:16px;margin:8px 0;">
                ${allFields.map(f => `<li>${f}</li>`).join("")}
               </ul>`
            : "<p>No additional details provided.</p>";

        const { error } = await resend.emails.send({
            from: 'New Lead <leads@wizards.co.in>',
            to: [userEmail],
            subject: `New response received for "${formName}"`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 16px; line-height: 1.6; font-size: 15px;">
                    <p>Hi,</p>

                    <p>We received an inquiry on your ${accountName} Account through our Leads Wizard</p>

                    <p style="margin: 8px 0;">
                       <b>Form Name:</b> ${formName}
                    </p>
                    ${fieldsHtml}

                    <p>Please check the same in your Account and do a followup.</p>
                    <p>You can log in to your dashboard to view the full response details.</p>
                    <a href="https://leads.wizards.co.in" target="_blank">
                        https://leads.wizards.co.in
                    </a>
                    <p style="margin-top: 24px;">
                       Regards,<br/>
                       <b>Your Team</b>
                    </p>
                </div>
            `,
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

interface Props {
    userEmail: string;
    allFields: string[];
    accountName: string;
    formName?: string;
}

export async function sendResponseAlertEmailToUser({ userEmail, allFields, accountName }: Props) {
    try {
        if (!userEmail) {
            console.warn("⚠️ User email missing. Skipping user email.");
            return { success: false, skipped: true };
        }

        const safeAccountName = accountName || "Our Team";
        const fieldsHtml = allFields.length
            ? `<ul style="padding-left:16px;margin:8px 0;">
                ${allFields.map(f => `<li>${f}</li>`).join("")}
               </ul>`
            : "<p>No additional details provided.</p>";

        const subject = `We received your response – ${safeAccountName}`;

        const html = `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#333">
                <h2 style="color:#2563eb">Thank you for your response</h2>

                <p>
                    Hi,<br/>
                    We’ve received your inquiry on our <b>${safeAccountName} Account</b>.
                </p>

                <p><b>The details are as following:</b></p>
                ${fieldsHtml}

                <p style="margin-top:16px">
                    Thanks for showing interest.</b>
                    Someone from our Team will get in touch with you.
                </p>

                <p style="margin-top:24px;font-size:12px;color:#666">
                    — ${safeAccountName}
                </p>
            </div>
        `;
        const { error } = await resend.emails.send({
            from: `${safeAccountName} <leads@wizards.co.in>`,
            to: [userEmail],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("❌ Failed to send alert email:", error);
            return { success: false, error };
        }

        return { success: true, message: "Alert email sent successfully" };
    } catch (err: any) {
        console.error("❌ User email error:", err);
        return { success: false, error: err.message };
    }
}
