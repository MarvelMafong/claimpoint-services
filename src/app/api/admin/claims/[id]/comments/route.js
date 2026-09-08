import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
import { createNotification } from '@/lib/notifications/create';

export async function POST(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id: claimId } = await params;
  const { message } = await request.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: claim } = await supabase
    .from('recovery_cases')
    .select('user_id, reference, category')
    .eq('id', claimId)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found.' }, { status: 404 });
  }

  const { data: comment, error } = await supabase
    .from('claim_comments')
    .insert({ claim_id: claimId, admin_id: admin.id, message: message.trim() })
    .select()
    .single();

  if (error) {
    console.error('Claim comment error:', error.message);
    return NextResponse.json({ error: 'Could not save comment.' }, { status: 500 });
  }

  // Email built inline here rather than through the shared templates file,
  // so this doesn't depend on a template signature I can't currently see.
  const { data: authUser } = await supabase.auth.admin.getUserById(claim.user_id);
  const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', claim.user_id).single();

  if (authUser?.user?.email) {
    await sendEmail({
      to: authUser.user.email,
      subject: `Update on your claim ${claim.reference}`,
      html: `
        <p>Hi ${profile?.first_name ?? 'there'},</p>
        <p>ClaimPoint has posted an update on your ${claim.category} claim (${claim.reference}):</p>
        <blockquote style="border-left: 3px solid #5B4BFF; padding-left: 12px; color: #333;">${message.trim()}</blockquote>
        <p>You can view the full claim and reply from your ClaimPoint dashboard.</p>
      `,
    });
  }

  await createNotification({
    userId: claim.user_id,
    title: 'Update on your claim',
    message: `ClaimPoint added a note to your ${claim.category} claim (${claim.reference}).`,
    type: 'claim',
    relatedEntityType: 'recovery_case',
    relatedEntityId: claimId,
  });

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'add_claim_comment',
    entity_type: 'claim_comment',
    entity_id: comment.id,
    new_value: { claim_id: claimId, message: message.trim() },
  });

  return NextResponse.json({ comment }, { status: 201 });
}

export async function GET(request, { params }) {
  await requireAdmin();
  const { id: claimId } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: comments } = await supabase
    .from('claim_comments')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ comments: comments ?? [] }, { status: 200 });
}