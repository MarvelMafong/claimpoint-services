import { NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { SESSION_ONLY_COOKIE, normalizeEmail } from '@/lib/auth/helpers';
import { isGoogleOnlyAccount } from '@/lib/auth/lookup';
import { deliverEmail } from '@/lib/email/deliver';
import { emailTemplates } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

const GENERIC_ERROR = 'Something went wrong logging you in. Please try again.';

const isInvalidCreds = (err) =>
  !!err &&
  (err.code === 'invalid_credentials' ||
    (err.message ?? '').toLowerCase().includes('invalid login credentials'));

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const email = normalizeEmail(body?.email);
    const rawPassword = typeof body?.password === 'string' ? body.password : '';
    const password = rawPassword.trim();
    const rememberMe = body?.rememberMe === true;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const service = getSupabaseServiceClient();

    // Lockout: failures inside the window, counting only failures made
    // after the user's last successful login, so old failed attempts can
    // never lock out someone who has since logged in fine.
    let lockedOut = false;
    let lastSuccessMs = 0;
    try {
      const windowStartMs = Date.now() - WINDOW_MINUTES * 60 * 1000;
      const { data: lastOk } = await service
        .from('login_attempts')
        .select('created_at')
        .eq('email', email)
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(1);
      const lastOkMs = lastOk?.[0] ? new Date(lastOk[0].created_at).getTime() : 0;
      lastSuccessMs = lastOkMs;
      const since = new Date(Math.max(windowStartMs, lastOkMs)).toISOString();

      const { count, error: countError } = await service
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('email', email)
        .eq('success', false)
        .gt('created_at', since);
      if (countError) {
        console.error('login_attempts count error:', countError.message);
      } else {
        lockedOut = (count ?? 0) >= MAX_ATTEMPTS;
      }
    } catch (e) {
      console.error('login lockout check failed:', e?.message ?? e);
    }

    if (lockedOut) {
      return NextResponse.json(
        { error: `Too many attempts. Please wait ${WINDOW_MINUTES} minutes before trying again.` },
        { status: 429 }
      );
    }

    const sessionOnly = !rememberMe;
    const supabase = await getSupabaseServerClient({ sessionOnly });

    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    // Lenient on whitespace: if the trimmed password failed but the
    // password as typed differs, try it as typed too (covers accounts
    // whose stored password genuinely has leading/trailing spaces).
    if (isInvalidCreds(authError) && rawPassword !== password) {
      ({ data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: rawPassword,
      }));
    }

    const { error: insertError } = await service
      .from('login_attempts')
      .insert({ email, success: !authError });
    if (insertError) console.error('login_attempts insert error:', insertError.message);

    if (authError) {
      if (isInvalidCreds(authError)) {
        let googleOnly = false;
        try {
          googleOnly = await isGoogleOnlyAccount(service, email);
        } catch (e) {
          console.error('google-only check failed:', e?.message ?? e);
        }
        if (googleOnly) {
          return NextResponse.json(
            { error: "This account uses Google sign-in. Use 'Continue with Google'." },
            { status: 401 }
          );
        }
        return NextResponse.json(
          { error: "That email and password combination doesn't match our records." },
          { status: 401 }
        );
      }
      if (
        authError.code === 'email_not_confirmed' ||
        (authError.message ?? '').toLowerCase().includes('email not confirmed')
      ) {
        return NextResponse.json(
          { error: 'Please confirm your email address before logging in.' },
          { status: 401 }
        );
      }
      console.error('signInWithPassword error:', authError.code, authError.message);
      // Supabase's own per-IP sign-in rate limit (not our lockout).
      if (authError.status === 429 || authError.code === 'over_request_rate_limit') {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 429 });
      }
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }

    // A successful login clears this email's failed attempts (success rows
    // are kept — they feed the login history in settings).
    const { error: clearError } = await service
      .from('login_attempts')
      .delete()
      .eq('email', email)
      .eq('success', false);
    if (clearError) console.error('login_attempts cleanup error:', clearError.message);

    // "Stay logged in" unchecked → Supabase's cookies were written as
    // session cookies by the server client (no maxAge), and this marker keeps
    // later refreshes (middleware, browser) session-only too. The cookies
    // stay readable by the browser client so logout and password reset work.
    const cookieStore = await cookies();
    if (sessionOnly) {
      cookieStore.set(SESSION_ONLY_COOKIE, '1', {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    } else {
      cookieStore.delete(SESSION_ONLY_COOKIE);
    }

    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError) console.error('login profile lookup error:', profileError.message);

    // Security alert for a new login (skipped if the previous login was under 10 minutes ago).
    if (Date.now() - lastSuccessMs > 10 * 60 * 1000) {
      const loginUser = authData.user;
      after(async () => {
        const { data: p } = await service.from('profiles').select('first_name').eq('id', loginUser.id).maybeSingle();
        const { subject, html } = emailTemplates.newLogin(p?.first_name ?? 'there');
        await deliverEmail({ userId: loginUser.id, to: loginUser.email, category: 'security', subject, html });
      });
    }

    return NextResponse.json(
      { success: true, onboardingCompleted: profile?.onboarding_completed ?? true },
      { status: 200 }
    );
  } catch (e) {
    console.error('POST /api/auth/login failed:', e?.message ?? e);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
