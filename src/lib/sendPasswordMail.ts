import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLoginDetails(email: string, name: string, password: string) {

  const { error } = await resend.emails.send({
    from: 'Login Credentials <leads@wizards.co.in>',
    to: [email],
    subject: 'Login credentials for your account',
    html: `
      <div style="font-family: Arial; padding: 16px">
        <p>Hello <b>${name}</b>,</p>
        <p>Your account has been created. Here are your login details:</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Password:</b> ${password}</p>
        <p>You can now log in and change your password from dashboard.</p>
        
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
        <p>Regards,<br/>Team</p>
      </div>
    `,
  });

  if (error) {
    console.error('❌ Email sending failed:', error);
    return error
  }

  return "Email sent successfully"

}