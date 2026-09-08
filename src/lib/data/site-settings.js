import { getSupabaseServerClient } from '@/lib/supabase/server';

// Business info shown on the public site must be admin-configurable, not
// hardcoded — this is a spec requirement, not a nice-to-have. Every
// component that displays company info (footer, contact page, etc.) reads
// from this function, never from a hardcoded string.
//
// Falls back to safe defaults if the row doesn't exist yet (e.g. before the
// admin has configured anything), so the site never breaks on empty data.
export async function getSiteSettings() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) {
    return {
      company_name: 'ClaimPoint Solutions',
      support_email: null,
      support_phone: null,
      footer_legal_note:
        'ClaimPoint Solutions provides recovery and banking services through licensed financial partners. Recovery outcomes are not guaranteed. Fees, where applicable, are success based and disclosed before you agree to proceed.',
    };
  }

  return data;
}