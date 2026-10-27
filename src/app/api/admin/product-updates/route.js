import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { deliverEmail } from '@/lib/email/deliver';
import { emailTemplates } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

// Sends a "product update" email to every customer who has the Product
// updates toggle on. Body: { subject, message, dryRun? }. dryRun only counts
// recipients.
export async function POST(request) {
  const { user: admin } = await requireAdmin();
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, first_name')
    .filter('notification_preferences->>email_marketing', 'eq', 'true')
    .limit(1000);
  if (error) {
    console.error('product-updates recipients error:', error.message);
    return NextResponse.json({ error: 'Could not load recipients.' }, { status: 500 });
  }

  if (body.dryRun === true) {
    return NextResponse.json({ recipients: profiles.length, sent: 0 }, { status: 200 });
  }

  let sent = 0, failed = 0;
  for (const p of profiles) {
    const { data: u } = await supabase.auth.admin.getUserById(p.id);
    const to = u?.user?.email;
    if (!to) continue;
    const t = emailTemplates.productUpdate(p.first_name ?? 'there', subject, message);
    const r = await deliverEmail({ userId: p.id, to, category: 'marketing', subject: t.subject, html: t.html, prefs: { email_marketing: true } });
    if (r.status === 'sent') sent++; else failed++;
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'send_product_update',
    entity_type: 'email',
    new_value: { subject, recipients: profiles.length, sent, failed },
  });

  return NextResponse.json({ recipients: profiles.length, sent, failed }, { status: 200 });
}
