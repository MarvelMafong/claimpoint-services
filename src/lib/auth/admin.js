import { redirect } from 'next/navigation';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';

// The unguessable admin URL keeps the route off search engines and public
// links, but it is not access control by itself — anyone who discovers or
// guesses the URL still needs to pass this check. Every admin page and
// admin API route must call this before doing anything else.
export async function requireAdmin() {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // The user is already verified above via getUser(); the admins lookup uses
  // the service client so a missing/strict RLS policy on `admins` can never
  // bounce a real admin away.
  const { data: adminRow, error } = await getSupabaseServiceClient()
    .from('admins')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('requireAdmin admins lookup error:', error.message);
  }

  if (!adminRow) {
    redirect('/dashboard');
  }

  return { user, role: adminRow.role };
}
