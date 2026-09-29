import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/client';
import { emailTemplates } from '@/lib/email/templates';
import { analyzeVerificationDocument } from '@/lib/ai/analyze-verification';

export async function POST(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { idType, personal, documentIds } = body;

  if (!idType || !personal?.firstName || !personal?.lastName) {
    return NextResponse.json({ error: 'Missing required verification fields' }, { status: 400 });
  }

  const { data: session, error: insertError } = await supabase
    .from('verification_sessions')
    .insert({
      user_id: user.id,
      id_type: idType,
      legal_first_name: personal.firstName,
      legal_last_name: personal.lastName,
      date_of_birth: personal.dob || null,
      address: personal.address || null,
      city: personal.city || null,
      zip_code: personal.zip || null,
      status: 'submitted',
    })
    .select()
    .single();

  if (insertError) {
    console.error('Verification submission error:', insertError.message);
    return NextResponse.json({ error: 'Could not submit verification. Please try again.' }, { status: 500 });
  }

  // Link via the service client, scoped to this user's own unlinked
  // documents. This was the root of admins seeing "No documents found":
  // with no customer UPDATE policy on verification_documents the
  // RLS-scoped update silently linked nothing.
  const service = getSupabaseServiceClient();
  if (documentIds?.length) {
    const { error: linkError } = await service
      .from('verification_documents')
      .update({ session_id: session.id })
      .in('id', documentIds)
      .eq('user_id', user.id)
      .is('session_id', null);
    if (linkError) console.error('Verification document link error:', linkError.message);
  }

  // verification_status is a privileged field (admins set 'verified'), so
  // it's written with the service client rather than relying on customers
  // having UPDATE rights over it.
  await service
    .from('profiles')
    .update({ verification_status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (user.email) {
    const { subject, html } = emailTemplates.verificationSubmitted(personal.firstName || 'there');
    await sendEmail({ to: user.email, subject, html });
  }

  // Admin notification — service client, admin_notifications has no
  // insert policy for regular users by design.
  await service.from('admin_notifications').insert({
    type: 'verification',
    title: 'New verification submitted',
    message: `${personal.firstName ?? 'A customer'} submitted identity verification for review.`,
    related_entity_type: 'verification_session',
    related_entity_id: session.id,
  });

  try {
    const frontDoc = documentIds?.length
      ? (await service.from('verification_documents').select('storage_path').eq('id', documentIds[0]).eq('user_id', user.id).single()).data
      : null;
    if (frontDoc) {
      const { data: fileBlob } = await service.storage.from('verification-documents').download(frontDoc.storage_path);
      if (fileBlob) {
        const buffer = Buffer.from(await fileBlob.arrayBuffer());
        const analysis = await analyzeVerificationDocument(buffer.toString('base64'), fileBlob.type || 'image/jpeg');
        await service.from('verification_internal_review').insert({
          session_id: session.id,
          automated_check_result: analysis.result,
          risk_indicator: analysis.risk_indicator,
          recommended_action: analysis.result === 'no_anomaly_detected' ? 'Proceed to review' : 'Flag for closer review',
          reviewer_notes: analysis.notes,
        });
      }
    }
  } catch (aiError) {
    console.error('AI verification screening error:', aiError.message);
  }

  return NextResponse.json({ session }, { status: 201 });
}