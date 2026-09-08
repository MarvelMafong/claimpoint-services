import { createBrowserClient } from '@supabase/ssr';

// Lazy singleton pattern: the client is only created the first time it's
// actually needed, not at module load time. Creating it eagerly at import
// time breaks Next.js builds when env vars aren't available during the
// build step (e.g. static generation, CI).
let browserClient = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local.'
    );
  }

  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}