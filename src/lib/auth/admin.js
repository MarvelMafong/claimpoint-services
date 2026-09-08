import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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

  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id, role')
    .eq('user_id', user.id)
    .single();

  if (!adminRow) {
    redirect('/dashboard');
  }

  return { user, role: adminRow.role };
}