import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function POST(request) {
  const { email, password, rememberMe } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const service = getSupabaseServiceClient();

  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await service
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('success', false)
    .gte('created_at', windowStart);

  if (count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: `Too many attempts. Please wait ${WINDOW_MINUTES} minutes before trying again.` },
      { status: 429 }
    );
  }

  const cookieStore = await cookies();
  const beforeNames = new Set(cookieStore.getAll().map((c) => c.name));

  const supabase = await getSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

  await service.from('login_attempts').insert({ email, success: !authError });

  if (authError) {
    if (authError.message.toLowerCase().includes('invalid login credentials')) {
      return NextResponse.json({ error: "That email and password combination doesn't match our records." }, { status: 401 });
    }
    if (authError.message.toLowerCase().includes('email not confirmed')) {
      return NextResponse.json({ error: 'Please confirm your email address before logging in.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Something went wrong logging you in. Please try again.' }, { status: 500 });
  }

  // "Stay logged in" unchecked → re-set whatever cookies Supabase just
  // wrote, but as session cookies (no maxAge), so they clear when the
  // browser closes instead of persisting for weeks. Diffing cookies
  // before/after the sign-in call, rather than hardcoding Supabase's
  // internal cookie names, so this doesn't silently break if that
  // naming ever changes in a future @supabase/ssr version.
  if (!rememberMe) {
    const afterCookies = cookieStore.getAll();
    for (const cookie of afterCookies) {
      if (!beforeNames.has(cookie.name)) {
        cookieStore.set(cookie.name, cookie.value, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          // no maxAge/expires — browser treats this as a session cookie
        });
      }
    }
  }

  const { data: profile } = await service
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', authData.user.id)
    .single();

  return NextResponse.json({ success: true, onboardingCompleted: profile?.onboarding_completed ?? true }, { status: 200 });
}