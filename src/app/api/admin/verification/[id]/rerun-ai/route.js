import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { analyzeVerificationDocument } from '@/lib/ai/analyze-verification';

// Lets an admin manually trigger AI screening on a submission that either
// never got it (Gemini was down at signup time) or where the admin wants
// a fresh pass. Same conservative logic as the automatic version.
export async function POST(request, { params }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: doc } = await supabase
    .from('verification_documents')
    .select('storage_path')
    .eq('session_id', id)
    .eq('doc_type', 'front')
    .single();

  if (!doc) {
    return NextResponse.json({ error: 'No front-of-ID document found for this session.' }, { status: 404 });
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('verification-documents')
    .download(doc.storage_path);

  if (downloadError || !fileBlob) {
    return NextResponse.json({ error: 'Could not retrieve the document for analysis.' }, { status: 500 });
  }

  const buffer = Buffer.from(await fileBlob.arrayBuffer());
  const analysis = await analyzeVerificationDocument(buffer.toString('base64'), fileBlob.type || 'image/jpeg');

  const { data: reviewRow, error: insertError } = await supabase
    .from('verification_internal_review')
    .insert({
      session_id: id,
      automated_check_result: analysis.result,
      risk_indicator: analysis.risk_indicator,
      recommended_action: analysis.result === 'no_anomaly_detected' ? 'Proceed to review' : 'Flag for closer review',
      reviewer_notes: analysis.notes,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: 'Analysis ran but could not be saved.' }, { status: 500 });
  }

  return NextResponse.json({ review: reviewRow }, { status: 201 });
}