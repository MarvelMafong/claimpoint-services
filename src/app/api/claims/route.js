import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
import { emailTemplates } from '@/lib/email/templates';

export async function POST(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { category, details, evidenceFileIds } = body;

  if (!category || !details) {
    return NextResponse.json({ error: 'Missing required claim fields' }, { status: 400 });
  }

  const { data: refData } = await supabase.rpc('generate_claim_reference');
  const reference = refData ?? `CP-${Math.floor(10000 + Math.random() * 90000)}`;

  const { data: claim, error: insertError } = await supabase
    .from('recovery_cases')
    .insert({
      user_id: user.id,
      reference,
      category,
      status: 'submitted',
      amount: details.amount ? Number(String(details.amount).replace(/[^0-9.]/g, '')) : null,
      details,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Claim submission error:', insertError.message);
    return NextResponse.json({ error: 'Could not submit claim. Please try again.' }, { status: 500 });
  }

  if (evidenceFileIds?.length) {
    await supabase
      .from('claim_evidence')
      .update({ claim_id: claim.id })
      .in('id', evidenceFileIds)
      .eq('user_id', user.id);
  }

  const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single();

  if (user.email) {
    const { subject, html } = emailTemplates.claimSubmitted(profile?.first_name ?? 'there', reference);
    await sendEmail({ to: user.email, subject, html });
  }

  // Admin notification — service client since admin_notifications has no
  // insert policy for regular users by design.
  const service = getSupabaseServiceClient();
  await service.from('admin_notifications').insert({
    type: 'claim',
    title: 'New claim submitted',
    message: `${profile?.first_name ?? 'A customer'} filed a ${category} claim (${reference}).`,
    related_entity_type: 'recovery_case',
    related_entity_id: claim.id,
  });

  return NextResponse.json({ claim }, { status: 201 });
}