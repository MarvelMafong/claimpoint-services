import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/create';
import { sendEmail } from '@/lib/email/client';
import { emailTemplates } from '@/lib/email/templates';

export async function PATCH(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id } = await params;
  const { status, notes } = await request.json();

  if (!status) {
    return NextResponse.json({ error: 'Missing status' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: existing } = await supabase
    .from('recovery_cases')
    .select('status, user_id, reference')
    .eq('id', id)
    .single();

  const { data: updated, error } = await supabase
    .from('recovery_cases')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Admin status update error:', error.message);
    return NextResponse.json({ error: 'Could not update case status.' }, { status: 500 });
  }

  // Audit trail — who changed what, from what, to what. Required by the
  // spec for anything touching financial or case data.
  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'update_claim_status',
    entity_type: 'claim',
    entity_id: id,
    previous_value: { status: existing?.status },
    new_value: { status },
    reason: notes || null,
  });

  if (existing?.user_id) {
    const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', existing.user_id).single();
    await createNotification({
      userId: existing.user_id,
      title: 'Claim status updated',
      message: `Your claim ${existing.reference} is now ${status.replace(/_/g, ' ')}.`,
      type: 'claims',
      relatedEntityType: 'claim',
      relatedEntityId: id,
    });

    const { data: { user: customer } } = await supabase.auth.admin.getUserById(existing.user_id);
    if (customer?.email) {
      const { subject, html } = emailTemplates.claimStatusChanged(profile?.first_name ?? 'there', existing.reference, status);
      await sendEmail({ to: customer.email, subject, html });
    }
  }

  return NextResponse.json({ claim: updated }, { status: 200 });
}