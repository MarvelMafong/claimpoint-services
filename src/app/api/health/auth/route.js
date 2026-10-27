import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

// Reports only which checks passed — never values, keys or error details.
export async function GET() {
  const checks = {
    env: Object.fromEntries(REQUIRED_ENV.map((k) => [k, !!process.env[k]])),
    emailConfigured: !!process.env.RESEND_API_KEY,
    supabaseAuth: false,
    database: false,
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    try {
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: { apikey: anonKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      checks.supabaseAuth = res.ok;
      if (!res.ok) console.error('health/auth: auth health returned', res.status);
    } catch (e) {
      console.error('health/auth: auth check failed:', e?.message ?? e);
    }
  }

  if (checks.env.SUPABASE_SERVICE_ROLE_KEY && url) {
    try {
      const { error } = await getSupabaseServiceClient().from('site_settings').select('id').limit(1);
      checks.database = !error;
      if (error) console.error('health/auth: database check failed:', error.message);
    } catch (e) {
      console.error('health/auth: database check threw:', e?.message ?? e);
    }
  }

  const ok =
    Object.values(checks.env).every(Boolean) && checks.supabaseAuth && checks.database;
  return NextResponse.json(
    { ok, checks },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}
