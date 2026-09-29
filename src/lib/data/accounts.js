import { getSupabaseServerClient } from '@/lib/supabase/server';

// The Standard account type has been written as both 'standard' and
// 'standard_account' in different parts of the codebase. Treat both as
// the Standard account everywhere so no check silently misses it.
export const STANDARD_ACCOUNT_TYPES = ['standard', 'standard_account'];

export function isStandardAccount(account) {
  return STANDARD_ACCOUNT_TYPES.includes(account?.account_type);
}

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
  const primary = accounts.find(isStandardAccount) ?? accounts[0] ?? null;
  return { account: primary, error: null };
}