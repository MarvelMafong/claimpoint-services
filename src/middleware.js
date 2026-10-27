import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { SESSION_ONLY_COOKIE, applySessionOnly } from '@/lib/auth/helpers';

const ADMIN_PREFIX = '/cp-adm-7f92mk3x';

// Every customer page that needs a logged-in user.
const CUSTOMER_PREFIXES = [
  '/dashboard',
  '/accounts',
  '/activity',
  '/beneficiaries',
  '/claims',
  '/deposits',
  '/documents',
  '/notifications',
  '/referrals',
  '/savings',
  '/settings',
  '/support',
  '/transfers',
  '/withdrawals',
  '/onboarding',
  '/verify',
];

const matches = (path, prefix) => path === prefix || path.startsWith(prefix + '/');

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  const isAdminPage = matches(path, ADMIN_PREFIX);
  const isAdminApi = matches(path, '/api/admin');
  const isCustomerPage = CUSTOMER_PREFIXES.some((p) => matches(path, p));
  const isProtected = isAdminPage || isAdminApi || isCustomerPage;

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('middleware: missing Supabase env vars');
    return response;
  }

  const sessionOnly = request.cookies.get(SESSION_ONLY_COOKIE)?.value === '1';

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, applySessionOnly(options, sessionOnly))
        );
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (e) {
    // Supabase unreachable: don't bounce a possibly-valid user to /login.
    // Pages and API routes re-check the session themselves.
    console.error('middleware getUser failed:', e?.message ?? e);
    return response;
  }

  if (isProtected && !user) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    redirect.headers.set('Cache-Control', 'no-store');
    return redirect;
  }

  // Admin API calls from a non-admin get a JSON 403 instead of an HTML
  // redirect that a fetch() caller would choke on.
  if (isAdminApi && user) {
    try {
      const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: adminRow, error } = await service
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        console.error('middleware admin lookup error:', error.message);
      } else if (!adminRow) {
        return NextResponse.json(
          { error: 'Not authorized' },
          { status: 403, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    } catch (e) {
      console.error('middleware admin check failed:', e?.message ?? e);
    }
  }

  // Logged-in pages must never be served from the browser's back/forward
  // cache after logout.
  if (isProtected) {
    response.headers.set('Cache-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
};
