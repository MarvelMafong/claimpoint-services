import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { SESSION_ONLY_COOKIE, applySessionOnly } from '@/lib/auth/helpers';

// Server-side client for Server Components, Server Actions, and Route
// Handlers. Built fresh per request (cookies are request-scoped), but the
// creation itself stays lazy — nothing touches env vars or cookies until
// this function is actually called.
//
// `sessionOnly` forces session-only cookies (used by the login route when
// "Stay logged in" is unticked). When omitted it follows the marker cookie
// the login route leaves behind, so token refreshes keep the same lifetime.
export async function getSupabaseServerClient({ sessionOnly } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local.'
    );
  }

  const cookieStore = await cookies();
  const forceSessionOnly =
    sessionOnly ?? cookieStore.get(SESSION_ONLY_COOKIE)?.value === '1';

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, applySessionOnly(options, forceSessionOnly))
          );
        } catch {
          // Called from a Server Component without a mutable cookie store.
          // Safe to ignore if middleware is refreshing sessions.
        }
      },
    },
  });
}

// Admin/service-role client — SERVER ONLY, never import this from a Client
// Component or expose it to the browser. Used for admin routes and
// operations that must bypass Row Level Security (e.g. reading across all
// customers' claims in the admin dashboard).
let serviceClient = null;

export function getSupabaseServiceClient() {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.'
    );
  }

  // Plain createClient, not createServerClient — service role calls don't
  // need cookie-based session handling, they authenticate via the key itself.
  serviceClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serviceClient;
}
