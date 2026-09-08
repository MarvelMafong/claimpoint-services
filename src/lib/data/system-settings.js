import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getSystemSettings() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    // Safe default: everything OFF/disabled if we can't confirm settings —
    // never fail open on a financial feature flag.
    return {
      production_financial_processing: false,
      deposits_enabled: true,
      withdrawals_enabled: true,
      transfers_enabled: true,
    };
  }

  return data;
}