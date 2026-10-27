import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getFromAddress, sendEmail } from '@/lib/email/client';
import { emailTemplates } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

// Admin-only: sends one real test email through Resend so the key and
// sender address can be verified. Body: { to }. Returns no secrets.
export async function POST(request) {
  await requireAdmin();
  let to = '';
  try {
    to = (await request.json())?.to ?? '';
  } catch {}
  if (typeof to !== 'string' || !to.includes('@')) {
    return NextResponse.json({ error: 'A recipient email is required.' }, { status: 400 });
  }
  const { subject, html } = emailTemplates.newLogin('there');
  const result = await sendEmail({ to, subject, html });
  return NextResponse.json({
    ok: !result.error,
    configured: !!process.env.RESEND_API_KEY,
    from: result.from ?? getFromAddress(),
    id: result.data?.id ?? null,
    error: result.error ? (typeof result.error === 'string' ? result.error : result.error.message ?? 'send failed') : null,
  }, { status: result.error ? 502 : 200 });
}
