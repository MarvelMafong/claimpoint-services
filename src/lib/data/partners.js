import { getSupabaseServiceClient } from '@/lib/supabase/server';

function getPublicLogoUrl(supabase, logoPath) {
  const { data } = supabase.storage.from('partner-logos').getPublicUrl(logoPath);
  return data?.publicUrl ?? null;
}

export async function getAllPartners() {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) return { partners: [], error: error.message };

  const withUrls = (data ?? []).map((p) => ({ ...p, logoUrl: getPublicLogoUrl(supabase, p.logo_path) }));
  return { partners: withUrls, error: null };
}

export async function getPublishedPartners() {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  if (error) return { partners: [], error: error.message };

  const withUrls = (data ?? []).map((p) => ({ ...p, logoUrl: getPublicLogoUrl(supabase, p.logo_path) }));
  return { partners: withUrls, error: null };
}