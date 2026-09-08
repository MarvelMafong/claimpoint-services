import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getBeneficiaries() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('beneficiaries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getBeneficiaries error:', error.message);
    return { beneficiaries: [], error: error.message };
  }

  return { beneficiaries: data ?? [], error: null };
}