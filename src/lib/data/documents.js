import { getSupabaseServerClient } from '@/lib/supabase/server';

// Pulls everything a customer has uploaded across both claim evidence and
// verification documents into one unified "Documents" view — real data
// from real tables, not a placeholder page.
export async function getCustomerDocuments() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { documents: [], error: 'Not authenticated' };

  const { data: evidence } = await supabase
    .from('claim_evidence')
    .select('id, file_name, created_at, claim_id')
    .eq('user_id', user.id);

  const { data: verificationDocs } = await supabase
    .from('verification_documents')
    .select('id, doc_type, created_at')
    .eq('user_id', user.id);

  const documents = [
    ...(evidence ?? []).map((e) => ({
      id: e.id,
      name: e.file_name,
      type: 'Claim evidence',
      date: e.created_at,
    })),
    ...(verificationDocs ?? []).map((v) => ({
      id: v.id,
      name: `Identity document (${v.doc_type})`,
      type: 'Verification',
      date: v.created_at,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return { documents, error: null };
}