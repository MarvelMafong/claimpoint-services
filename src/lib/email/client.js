import fs from 'node:fs';
import { Resend } from 'resend';

let resendClient = null;

export function getResendClient() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set, email will not send.');
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

const FALLBACK_FROM = 'ClaimPoint Solutions <onboarding@resend.dev>';

export function getFromAddress() {
  return process.env.EMAIL_FROM || 'ClaimPoint Solutions <noreply@claimpointsolutions.com>';
}

// Central sender: every email in the app goes through this, so the
// "from" address and error handling only live in one place.
//
// EMAIL_DRY_RUN_FILE (tests only): append the message to that file as JSON
// instead of calling Resend.
export async function sendEmail({ to, subject, html }) {
  const from = getFromAddress();

  if (process.env.EMAIL_DRY_RUN_FILE) {
    fs.appendFileSync(process.env.EMAIL_DRY_RUN_FILE, JSON.stringify({ from, to, subject, html }) + '\n');
    return { data: { id: 'dry-run' } };
  }

  const client = getResendClient();
  if (!client) return { error: 'Email not configured' };

  try {
    let { data, error } = await client.emails.send({ from, to, subject, html });
    // Sending domain not verified in Resend yet: fall back to Resend's shared
    // sender so something is still sent (it only reaches the Resend account owner).
    if (error && /not verified|domain/i.test(error.message ?? '') && from !== FALLBACK_FROM) {
      console.error('Resend rejected sender, retrying with fallback sender:', error.message);
      ({ data, error } = await client.emails.send({ from: FALLBACK_FROM, to, subject, html }));
    }
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
