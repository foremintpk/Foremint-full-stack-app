import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'Foremint <team@raobros.site>';

interface WelcomeEmailParams {
  name: string;
  email: string;
}

export async function sendWelcomeEmail({ name, email }: WelcomeEmailParams) {
  if (!resend) {
    console.log('Skipping welcome email: RESEND_API_KEY not found');
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Welcome to Foremint — Your Application is Under Review',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #000;">
        <h1 style="color: #34088f;">Welcome to Foremint, ${name}!</h1>
        <p>Thank you for completing your onboarding. Your documents have been received and our team will review your application within 1-2 business days.</p>
        <p>You can log in to your dashboard at any time to check your status and view your documents.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Foremint LLC. All rights reserved.</p>
      </div>
    `,
  });
}
