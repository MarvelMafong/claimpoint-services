import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getActiveProducts() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('financial_products')
    .select('*')
    .eq('status', 'active')
    .order('term_months', { ascending: true, nullsFirst: true });

  if (error) {
    console.error('getActiveProducts error:', error.message);
    return { products: [], error: error.message };
  }

  return { products: data ?? [], error: null };
}