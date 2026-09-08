import { getSupabaseServerClient } from '@/lib/supabase/server';

// Returns all financial accounts/products belonging to the current user.
// RLS on the accounts table (see supabase-accounts.sql) restricts this to
// rows where user_id = auth.uid() automatically — no manual filtering
// needed here, Postgres enforces it.
export async function getAccounts() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getAccounts error:', error.message);
    return { accounts: [], error: error.message };
  }

  return { accounts: data ?? [], error: null };
}

export async function getPrimaryAccount() {
  const { accounts, error } = await getAccounts();
  if (error) return { account: null, error };
  const primary = accounts.find((a) => a.account_type === 'standard') ?? accounts[0] ?? null;
  return { account: primary, error: null };
}