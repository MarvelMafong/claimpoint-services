import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SESSION_ONLY_COOKIE } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';

// Server-side logout: clears the Supabase session cookies no matter how
// they were issued (httpOnly or not), so a customer can always log out.
export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) console.error('logout signOut error:', error.message);
  } catch (e) {
    console.error('POST /api/auth/logout failed:', e?.message ?? e);
  }

  // Belt and braces: expire any leftover Supabase auth cookies.
  try {
    const cookieStore = await cookies();
    for (const c of cookieStore.getAll()) {
      if (c.name.startsWith('sb-') || c.name === SESSION_ONLY_COOKIE) {
        cookieStore.set(c.name, '', { path: '/', maxAge: 0 });
      }
    }
  } catch (e) {
    console.error('logout cookie cleanup failed:', e?.message ?? e);
  }

  return NextResponse.json({ success: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
