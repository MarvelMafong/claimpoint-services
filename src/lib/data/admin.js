import { getSupabaseServiceClient } from '@/lib/supabase/server';

// Every function here uses the service-role client, which bypasses RLS —
// that's necessary because admin screens read across all customers, not
// just the logged-in admin's own rows. This file is only ever imported
// from server code that has already passed requireAdmin(). Never import
// this from a Client Component.

export async function getOverviewStats() {
  const supabase = getSupabaseServiceClient();

  const { count: openClaims } = await supabase
    .from('recovery_cases')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("recovered","not_recovered","closed")');

  const { count: pendingVerifications } = await supabase
    .from('verification_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'submitted');

  const { count: recoveredCount } = await supabase
    .from('recovery_cases')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'recovered');

  const { count: totalClosedCount } = await supabase
    .from('recovery_cases')
    .select('*', { count: 'exact', head: true })
    .in('status', ['recovered', 'partially_recovered', 'not_recovered', 'closed']);

  const recoveryRate = totalClosedCount > 0
    ? Math.round((recoveredCount / totalClosedCount) * 100)
    : 0;

  return {
    openClaims: openClaims ?? 0,
    pendingVerifications: pendingVerifications ?? 0,
    recoveryRate,
  };
}

export async function getClaimsForAdmin() {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('recovery_cases')
    .select('*, profiles:user_id (first_name, last_name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getClaimsForAdmin error:', error.message);
    return { claims: [], error: error.message };
  }

  return { claims: data ?? [], error: null };
}

export async function getClaimDetail(claimId) {
  const supabase = getSupabaseServiceClient();

  const { data: claim, error } = await supabase
    .from('recovery_cases')
    .select('*, profiles:user_id (first_name, last_name)')
    .eq('id', claimId)
    .single();

  if (error) {
    return { claim: null, evidence: [], internalReview: null, error: error.message };
  }

  const { data: evidence } = await supabase
    .from('claim_evidence')
    .select('*')
    .eq('claim_id', claimId);

  const { data: internalReview } = await supabase
    .from('claim_internal_review')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { claim, evidence: evidence ?? [], internalReview, error: null };
}