import { Resend } from 'resend';

let resendClient = null;

export function getResendClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set — email will not send.');
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

// Central sender — every email in the app goes through this, so the
// "from" address and error handling only live in one place.
export async function sendEmail({ to, subject, html }) {
  const client = getResendClient();
  if (!client) return { error: 'Email not configured' };

  try {
    const { data, error } = await client.emails.send({
      from: 'ClaimPoint Solutions <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    if (error) {
      console.error('Resend send error:', error);
      return { error };
    }
    return { data };
  } catch (err) {
    console.error('Resend send exception:', err.message);
    return { error: err.message };
  }
}