import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getClaimDetailForCustomer(claimId) {
  const supabase = await getSupabaseServerClient();

  // RLS on recovery_cases already restricts this to the logged-in user's
  // own rows — no manual filtering needed, Postgres enforces it.
  const { data: claim, error } = await supabase
    .from('recovery_cases')
    .select('*')
    .eq('id', claimId)
    .single();

  if (error || !claim) {
    return { claim: null, evidence: [], error: error?.message ?? 'Not found' };
  }

  const { data: evidence } = await supabase
    .from('claim_evidence')
    .select('id, file_name, created_at')
    .eq('claim_id', claimId);

  return { claim, evidence: evidence ?? [], error: null };
}