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

  let { data: evidence } = await supabase
    .from('claim_evidence')
    .select('*')
    .eq('claim_id', claimId);

  // Claims filed before evidence linking was fixed can have their files
  // stranded with claim_id = null. Show the customer's unlinked uploads
  // from before this claim was filed so the reviewer can still see them.
  if (!evidence?.length && claim.user_id) {
    const { data: unlinked } = await supabase
      .from('claim_evidence')
      .select('*')
      .eq('user_id', claim.user_id)
      .is('claim_id', null)
      .lte('created_at', claim.created_at);
    evidence = (unlinked ?? []).map((e) => ({ ...e, unlinked: true }));
  }

  // The claim-evidence bucket is private, so admins can only view files
  // through short-lived (5 min) signed URLs generated with the service role.
  const evidenceWithUrls = await Promise.all(
    (evidence ?? []).map(async (item) => {
      if (!item.storage_path) return { ...item, signedUrl: null };
      const { data: signed, error: signError } = await supabase.storage
        .from('claim-evidence')
        .createSignedUrl(item.storage_path, 300);
      if (signError) console.error('Evidence signed URL error:', signError.message);
      return { ...item, signedUrl: signed?.signedUrl ?? null };
    })
  );

  const { data: comments } = await supabase
    .from('claim_comments')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true });

  const { data: internalReview } = await supabase
    .from('claim_internal_review')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { claim, evidence: evidenceWithUrls, comments: comments ?? [], internalReview, error: null };
}