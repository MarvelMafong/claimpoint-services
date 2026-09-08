import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
import { emailTemplates } from '@/lib/email/templates';
import { createNotification } from '@/lib/notifications/create';

export async function PATCH(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id } = await params;
  const { status, reason } = await request.json();
  const supabase = getSupabaseServiceClient();

  const { data: session } = await supabase
    .from('verification_sessions')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Verification session not found' }, { status: 404 });
  }

  await supabase.from('verification_sessions').update({ status }).eq('id', id);

  const profileUpdates = { verification_status: status, updated_at: new Date().toISOString() };
  // Clear any old reason on approval; store the new one on reject/more-info.
  profileUpdates.verification_rejection_reason = status === 'verified' ? null : (reason ?? null);

  await supabase.from('profiles').update(profileUpdates).eq('id', session.user_id);

  const { data: user } = await supabase.auth.admin.getUserById(session.user_id);
  const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', session.user_id).single();

  if (user?.user?.email) {
    const { subject, html } = emailTemplates.verificationStatusChanged(profile?.first_name ?? 'there', status);
    await sendEmail({ to: user.user.email, subject, html });
  }

  const messages = {
    verified: 'Your identity has been verified.',
    rejected: `Your verification wasn't approved${reason ? `: ${reason}` : '.'}`,
    additional_info_required: `We need more information: ${reason ?? 'please check your dashboard for details.'}`,
  };

  await createNotification({
    userId: session.user_id,
    title: 'Verification update',
    message: messages[status] ?? 'Your verification status has changed.',
    type: 'verification',
    relatedEntityType: 'verification_session',
    relatedEntityId: id,
  });

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'update_verification_status',
    entity_type: 'verification_session',
    entity_id: id,
    new_value: { status, reason: reason ?? null },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}