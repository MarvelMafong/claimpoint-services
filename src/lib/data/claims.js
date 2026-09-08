import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getClaims({ limit = null } = {}) {
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('recovery_cases')
    .select('*')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getClaims error:', error.message);
    return { claims: [], error: error.message };
  }

  return { claims: data ?? [], error: null };
}

export async function getProfile() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('getProfile error:', error.message);
    return { profile: null, error: error.message };
  }

  return { profile: data, error: null };
}