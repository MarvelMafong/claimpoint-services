import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getReferralData() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { referralCode: null, referrals: [], error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single();

  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getReferralData error:', error.message);
    return { referralCode: profile?.referral_code ?? null, referrals: [], error: error.message };
  }

  return { referralCode: profile?.referral_code ?? null, referrals: referrals ?? [], error: null };
}