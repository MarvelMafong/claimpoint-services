import { getSupabaseServiceClient } from '@/lib/supabase/server';

export function generateDisplayAccountNumber(accountId) {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    hash = (hash * 31 + accountId.charCodeAt(i)) >>> 0;
  }
  const digits = String(hash).padStart(10, '0').slice(0, 10);
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

export async function getCustomerDetail(userId) {
  const supabase = getSupabaseServiceClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { profile: null, accounts: [], claims: [], transactions: [], verificationSessions: [], profilePhotoSignedUrl: null, error: error?.message ?? 'Not found' };
  }

  const [{ data: accounts }, { data: claims }, { data: transactions }, { data: verificationSessions }] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', userId),
    supabase.from('recovery_cases').select('id, reference, category, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    // Full history now, not just the latest — the page previously only
    // ever showed one row even though multiple submissions can exist
    // (e.g. after a rejection and resubmit).
    supabase.from('verification_sessions').select('id, status, submitted_at, id_type').eq('user_id', userId).order('submitted_at', { ascending: false }),
  ]);

  const accountsWithNumbers = (accounts ?? []).map((a) => ({
    ...a,
    displayAccountNumber: generateDisplayAccountNumber(a.id),
  }));

  // Profile photo was being saved (onboarding already wires this up) but
  // never actually surfaced to admin — regenerating a fresh signed URL
  // here since the stored one may have expired.
  let profilePhotoSignedUrl = null;
  if (profile.profile_photo_url) {
    const pathMatch = profile.profile_photo_url.match(/profile-photos\/(.+?)(\?|$)/);
    if (pathMatch) {
      const { data: signed } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(pathMatch[1], 300);
      profilePhotoSignedUrl = signed?.signedUrl ?? null;
    }
  }

  return {
    profile,
    accounts: accountsWithNumbers,
    claims: claims ?? [],
    transactions: transactions ?? [],
    verificationSessions: verificationSessions ?? [],
    profilePhotoSignedUrl,
    error: null,
  };
}

export async function getAllCustomersWithStats() {
  const supabase = getSupabaseServiceClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { customers: [], totalCount: 0, error: error.message };
  return { customers: profiles ?? [], totalCount: profiles?.length ?? 0, error: null };
}