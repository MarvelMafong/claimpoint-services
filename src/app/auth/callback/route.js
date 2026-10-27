import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/auth/helpers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));
  const failure = () => NextResponse.redirect(`${origin}/login?error=oauth`);

  if (searchParams.get('error') || !code) {
    if (searchParams.get('error')) {
      console.error('auth callback provider error:', searchParams.get('error'), searchParams.get('error_description'));
    }
    return failure();
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.user) {
      console.error('auth callback exchange error:', error?.message ?? 'no user returned');
      return failure();
    }

    // An explicit same-origin ?next wins (e.g. password-reset links).
    if (next) return NextResponse.redirect(`${origin}${next}`);

    const { data: profile, error: profileError } = await getSupabaseServiceClient()
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profileError) console.error('auth callback profile lookup error:', profileError.message);

    const target = profile && profile.onboarding_completed === false ? '/onboarding' : '/dashboard';
    return NextResponse.redirect(`${origin}${target}`);
  } catch (e) {
    console.error('GET /auth/callback failed:', e?.message ?? e);
    return failure();
  }
}
