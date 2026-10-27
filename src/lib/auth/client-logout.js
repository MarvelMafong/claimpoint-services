import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// Server-side logout clears the session cookies however they were set; the
// browser-client call is a fallback. Full navigation afterwards so nothing
// from the logged-in session stays in the router cache or bfcache.
export async function logoutAndRedirect() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('logout request failed:', err);
  }
  try {
    await getSupabaseBrowserClient().auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('browser signOut failed:', err);
  }
  window.location.replace('/login');
}
