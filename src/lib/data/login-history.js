import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function getLoginHistory({ limit = 10 } = {}) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { history: [], error: null };

  // login_attempts has no RLS select policy for regular users (it's a
  // security-internal table), so this reads via the service client, but
  // only ever the current user's own email, matched server-side.
  const service = getSupabaseServiceClient();
  const { data, error } = await service
    .from('login_attempts')
    .select('created_at, success')
    .eq('email', user.email)
    .eq('success', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getLoginHistory error:', error.message);
    return { history: [], error: error.message };
  }

  return { history: data ?? [], error: null };
}