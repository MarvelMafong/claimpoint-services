import { getSupabaseServerClient } from '@/lib/supabase/server';

// limit = null fetches the full history (Activity page); a number fetches
// just that many rows (Dashboard's "recent transactions" card).
export async function getTransactions({ limit = null } = {}) {
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getTransactions error:', error.message);
    return { transactions: [], error: error.message };
  }

  return { transactions: data ?? [], error: null };
}