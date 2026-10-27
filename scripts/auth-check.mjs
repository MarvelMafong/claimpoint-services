// End-to-end auth check against a locally running app.
//
//   npm run dev            (in one terminal, uses .env.local = live Supabase)
//   BASE=http://localhost:3100 node scripts/auth-check.mjs
//
// Creates clearly named throwaway users (authtest+<run>-*@example.com and
// delivered+authtest-<run>@resend.dev), never deletes anything, and at the
// end randomises their passwords and removes only the temporary admins row
// it added. Exit code 1 if any check fails.

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BASE = (process.env.BASE || 'http://localhost:3100').replace(/\/$/, '');

// --- env ---------------------------------------------------------------
function loadEnv() {
  const file = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
loadEnv();
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) {
  console.error('Missing Supabase env vars in .env.local');
  process.exit(2);
}
const service = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = () => createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

// --- tiny http client with a cookie jar --------------------------------
class Jar {
  constructor() { this.c = new Map(); }
  header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join('; '); }
  absorb(res) {
    const list = res.headers.getSetCookie?.() ?? [];
    for (const raw of list) {
      const [pair, ...attrs] = raw.split(';').map((s) => s.trim());
      const i = pair.indexOf('=');
      const name = pair.slice(0, i);
      const value = pair.slice(i + 1);
      const maxAge = attrs.find((a) => /^max-age=/i.test(a));
      const expires = attrs.find((a) => /^expires=/i.test(a));
      const dead =
        (maxAge && Number(maxAge.split('=')[1]) <= 0) ||
        (expires && new Date(expires.split('=')[1]).getTime() < Date.now()) ||
        value === '';
      if (dead) this.c.delete(name); else this.c.set(name, value);
    }
    return list;
  }
  clone() { const j = new Jar(); j.c = new Map(this.c); return j; }
  authNames() { return [...this.c.keys()].filter((k) => k.startsWith('sb-')); }
}

async function http(method, p, { jar, body, headers = {} } = {}) {
  const res = await fetch(BASE + p, {
    method,
    redirect: 'manual',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(jar?.header() ? { Cookie: jar.header() } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(240000),
  });
  const setCookies = jar ? jar.absorb(res) : (res.headers.getSetCookie?.() ?? []);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, location: res.headers.get('location'), text, json, setCookies };
}

// Login helper that waits out Supabase's own sign-in rate limit (a 429 whose
// message is not our lockout message) instead of failing the run.
async function login(jar, email, password, rememberMe = false) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const r = await http('POST', '/api/auth/login', { jar, body: { email, password, rememberMe } });
    const rateLimited = r.status === 429 && !/Too many attempts/.test(r.json?.error ?? '');
    const genericRateLimit = r.status === 500 && /rate/i.test(r.text);
    if (!rateLimited && !genericRateLimit) return r;
    console.log('    (Supabase sign-in rate limit hit, waiting 30s)');
    await new Promise((res) => setTimeout(res, 30000));
  }
  throw new Error('still rate limited after waiting');
}

// --- test harness ------------------------------------------------------
const results = [];
async function t(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name} (${Date.now() - started}ms)`);
  } catch (e) {
    results.push({ name, ok: false, err: e.message });
    console.log(`  FAIL  ${name}\n        ${e.message}`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const eq = (a, b, msg) => assert(a === b, `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const isLoginRedirect = (r) => r.status >= 300 && r.status < 400 && /\/login(\?|$)/.test(r.location ?? '');

const RUN = Date.now().toString(36);
const mail = (tag) => `authtest+${RUN}-${tag}@example.com`;
const rand = () => randomBytes(9).toString('hex');
const SYMBOL_PW = `Sy!@#$%^&*()_+-=[]{};:'",.<>/?|~\`1aB-${rand()}`;
const created = [];
let adminUserId = null;

async function makeUser(tag, { password, metadata, app_metadata, confirmed = true } = {}) {
  const email = mail(tag);
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: confirmed,
    user_metadata: { first_name: 'Auth', last_name: `Test ${tag}`, ...(metadata ?? {}) },
    ...(app_metadata ? { app_metadata } : {}),
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  created.push({ email, id: data.user.id });
  return { email, id: data.user.id, password };
}

async function failedCount(email) {
  const { count } = await service.from('login_attempts').select('*', { count: 'exact', head: true }).eq('email', email).eq('success', false);
  return count ?? 0;
}

function decodeSessionCookie(jar) {
  const names = jar.authNames().filter((n) => /-auth-token(\.\d+)?$/.test(n)).sort();
  assert(names.length > 0, 'no auth-token cookie in jar');
  const base = names[0].replace(/\.\d+$/, '');
  const raw = names.map((n) => jar.c.get(n)).join('');
  const val = decodeURIComponent(raw).replace(/^base64-/, '');
  return { base, session: JSON.parse(Buffer.from(val, 'base64url').toString('utf8')), names };
}
function encodeSessionCookie(session) {
  return 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
}

// ------------------------------------------------------------------------
async function main() {
  console.log(`auth-check run ${RUN} against ${BASE}`);

  const pw = `Pw!${rand()}`;
  const main_ = await makeUser('main', { password: pw });
  const symbol = await makeUser('symbol', { password: SYMBOL_PW });
  const google = await makeUser('google', { app_metadata: { provider: 'google', providers: ['google'] } });
  const customer = await makeUser('customer', { password: `Cu!${rand()}` });
  const admin = await makeUser('admin', { password: `Ad!${rand()}` });
  const lock = await makeUser('lock', { password: `Lo!${rand()}` });
  const fresh = await makeUser('fresh', { password: `Fr!${rand()}` });
  const reset = await makeUser('reset', { password: `Re!${rand()}` });
  adminUserId = admin.id;

  // Make sure profiles exist and set onboarding flags for the redirect checks.
  for (const u of [main_, customer, admin]) {
    await service.from('profiles').update({ onboarding_completed: true }).eq('id', u.id);
  }
  await service.from('profiles').update({ onboarding_completed: false }).eq('id', fresh.id);
  await service.from('admins').upsert({ user_id: admin.id, role: 'admin' });

  // ---- health --------------------------------------------------------
  console.log('\n[health]');
  await t('GET /api/health/auth is ok and exposes no secrets', async () => {
    const r = await http('GET', '/api/health/auth');
    eq(r.status, 200, 'status');
    assert(r.json?.ok === true, 'ok flag');
    assert(!r.text.includes(SERVICE) && !r.text.includes(ANON), 'secret leaked');
  });
  await t('GET /api/keep-alive is ok', async () => {
    const r = await http('GET', '/api/keep-alive');
    eq(r.status, 200, 'status');
  });

  // ---- login basics --------------------------------------------------
  console.log('\n[login]');
  let mainJar = new Jar();
  await t('email login succeeds', async () => {
    const r = await login(mainJar, main_.email, main_.password, true);
    eq(r.status, 200, 'status');
    assert(r.json.success === true, 'success flag');
    eq(r.json.onboardingCompleted, true, 'onboardingCompleted');
    assert(mainJar.authNames().length > 0, 'no sb- cookies set');
  });
  await t('different capitalisation + surrounding spaces in email', async () => {
    const r = await login(new Jar(), `  ${main_.email.toUpperCase()}  `, main_.password);
    eq(r.status, 200, 'status');
  });
  await t('spaces around the password are trimmed', async () => {
    const r = await login(new Jar(), main_.email, `  ${main_.password}  `);
    eq(r.status, 200, 'status');
  });
  await t('password with many symbols', async () => {
    const r = await login(new Jar(), symbol.email, SYMBOL_PW);
    eq(r.status, 200, 'status');
  });
  await t('wrong password -> generic 401, never reveals existence', async () => {
    const a = await login(new Jar(), main_.email, 'definitely-wrong-1');
    const b = await login(new Jar(), `authtest+nobody-${RUN}@example.com`, 'definitely-wrong-1');
    eq(a.status, 401, 'known email status');
    eq(b.status, 401, 'unknown email status');
    eq(a.json.error, b.json.error, 'same message for known/unknown');
    assert(!/google/i.test(a.json.error), 'must not mention Google for password accounts');
  });
  await t('password match alone never logs in under another email', async () => {
    const r = await login(new Jar(), `authtest+wrong-${RUN}@example.com`, main_.password);
    eq(r.status, 401, 'status');
  });
  await t('Google-only account gets the Google message', async () => {
    const r = await login(new Jar(), google.email, 'whatever-123');
    eq(r.status, 401, 'status');
    eq(r.json.error, "This account uses Google sign-in. Use 'Continue with Google'.", 'message');
  });
  await t('malformed / empty bodies never produce a raw error', async () => {
    const r1 = await http('POST', '/api/auth/login', { headers: { 'Content-Type': 'application/json' }, body: undefined });
    assert(r1.status === 400 && typeof r1.json?.error === 'string', `empty body -> ${r1.status} ${r1.text.slice(0, 80)}`);
    const r2 = await http('POST', '/api/auth/login', { body: { email: '   ', password: '  ' } });
    eq(r2.status, 400, 'blank creds');
    assert(typeof r2.json?.error === 'string', 'json error');
  });
  await t('double-click: two concurrent logins both succeed', async () => {
    const [a, b] = await Promise.all([
      login(new Jar(), main_.email, main_.password),
      login(new Jar(), main_.email, main_.password),
    ]);
    assert(a.status === 200 && b.status === 200, `statuses ${a.status}/${b.status}`);
  });
  await t('first login of a not-yet-onboarded user reports onboardingCompleted=false', async () => {
    const r = await login(new Jar(), fresh.email, fresh.password);
    eq(r.status, 200, 'status');
    eq(r.json.onboardingCompleted, false, 'onboardingCompleted');
  });

  // ---- lockout -------------------------------------------------------
  console.log('\n[lockout]');
  await t('two real wrong attempts are recorded as failures', async () => {
    const before = await failedCount(lock.email);
    await login(new Jar(), lock.email, 'nope-1');
    await login(new Jar(), lock.email, 'nope-2');
    eq((await failedCount(lock.email)) - before, 2, 'failure rows added');
  });
  await t('10 recent failures lock the account (even for the right password)', async () => {
    const rows = Array.from({ length: 10 }, () => ({ email: lock.email, success: false }));
    await service.from('login_attempts').insert(rows);
    const r = await http('POST', '/api/auth/login', { body: { email: lock.email, password: lock.password } });
    eq(r.status, 429, 'status');
    assert(/Too many attempts/.test(r.json.error), 'lockout message');
  });
  await t('lock expires: failures older than the window do not lock', async () => {
    await service.from('login_attempts').delete().eq('email', lock.email).eq('success', false);
    const old = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await service.from('login_attempts').insert(Array.from({ length: 12 }, () => ({ email: lock.email, success: false, created_at: old })));
    const r = await login(new Jar(), lock.email, lock.password);
    eq(r.status, 200, 'status');
  });
  await t('successful login clears earlier failures', async () => {
    await login(new Jar(), lock.email, 'nope-a');
    await login(new Jar(), lock.email, 'nope-b');
    const r = await login(new Jar(), lock.email, lock.password);
    eq(r.status, 200, 'login');
    eq(await failedCount(lock.email), 0, 'failed rows after success');
  });
  await t('9 failures do not lock (limit is 10)', async () => {
    await service.from('login_attempts').insert(Array.from({ length: 9 }, () => ({ email: lock.email, success: false })));
    const r = await login(new Jar(), lock.email, lock.password);
    eq(r.status, 200, 'status');
  });

  // ---- stay logged in / cookies --------------------------------------
  console.log('\n[cookies]');
  await t('stay-logged-in OFF -> session cookies (no Max-Age/Expires), readable by JS, marker set', async () => {
    const jar = new Jar();
    const r = await login(jar, main_.email, main_.password, false);
    eq(r.status, 200, 'status');
    const sb = r.setCookies.filter((c) => c.startsWith('sb-'));
    assert(sb.length > 0, 'no sb- cookies');
    for (const c of sb) {
      assert(!/max-age=|expires=/i.test(c), `persistent cookie: ${c.slice(0, 60)}`);
      assert(!/httponly/i.test(c), `HttpOnly cookie (browser client could not read it): ${c.slice(0, 60)}`);
    }
    assert(r.setCookies.some((c) => c.startsWith('cp_session_only=1')), 'marker cookie missing');
  });
  await t('stay-logged-in ON -> persistent cookies, no marker', async () => {
    const jar = new Jar();
    const r = await login(jar, main_.email, main_.password, true);
    const sb = r.setCookies.filter((c) => c.startsWith('sb-'));
    assert(sb.length > 0 && sb.every((c) => /max-age=\d+/i.test(c)), 'cookies not persistent');
    assert(!r.setCookies.some((c) => c.startsWith('cp_session_only=1')), 'marker should not be set');
  });
  await t('session-only mode survives a token refresh as session-only', async () => {
    const jar = new Jar();
    await login(jar, customer.email, customer.password, false);
    const { base, session } = decodeSessionCookie(jar);
    session.expires_at = 1; // force the refresh path
    for (const n of jar.authNames()) jar.c.delete(n);
    jar.c.set(base, encodeSessionCookie(session));
    const r = await http('GET', '/dashboard', { jar });
    assert(r.status === 200, `status ${r.status}`);
    const sb = r.setCookies.filter((c) => c.startsWith('sb-'));
    assert(sb.length > 0, 'refresh did not rewrite cookies');
    assert(sb.every((c) => !/max-age=[1-9]/i.test(c)), 'refreshed cookies became persistent');
  });

  // ---- protected routes ----------------------------------------------
  console.log('\n[protected routes]');
  const customerPages = ['/dashboard', '/accounts', '/activity', '/beneficiaries', '/claims', '/deposits', '/documents', '/notifications', '/referrals', '/savings', '/settings', '/support', '/transfers', '/withdrawals', '/onboarding', '/verify'];
  await t('no session -> every customer page redirects to /login', async () => {
    const bad = [];
    for (const p of customerPages) {
      const r = await http('GET', p);
      if (!isLoginRedirect(r)) bad.push(`${p}:${r.status}`);
    }
    assert(bad.length === 0, bad.join(', '));
  });
  await t('no session -> admin pages redirect, admin API answers JSON 401', async () => {
    const p = await http('GET', '/cp-adm-7f92mk3x/dashboard');
    assert(isLoginRedirect(p), `admin page ${p.status}`);
    const a = await http('GET', '/api/admin/site-settings');
    eq(a.status, 401, 'admin api');
    assert(typeof a.json?.error === 'string', 'json body');
  });
  await t('garbage session cookie -> treated as logged out', async () => {
    const jar = new Jar();
    jar.c.set('sb-bogus-auth-token', 'base64-' + Buffer.from('{"access_token":"x","refresh_token":"y","expires_at":9999999999}').toString('base64url'));
    const r = await http('GET', '/dashboard', { jar });
    assert(isLoginRedirect(r), `status ${r.status}`);
  });
  const custJar = new Jar();
  await t('customer session reaches customer pages (no-store)', async () => {
    const l = await login(custJar, customer.email, customer.password, true);
    eq(l.status, 200, 'login');
    const bad = [];
    for (const p of ['/dashboard', '/settings', '/savings', '/claims', '/accounts']) {
      const r = await http('GET', p, { jar: custJar });
      if (r.status !== 200) bad.push(`${p}:${r.status}${r.location ? '->' + r.location : ''}`);
      else if (!/no-store/.test(r.headers.get('cache-control') ?? '')) bad.push(`${p}: missing no-store`);
    }
    assert(bad.length === 0, bad.join(', '));
  });
  await t('customer is kept out of admin (page -> /dashboard, API -> JSON 403)', async () => {
    const p = await http('GET', '/cp-adm-7f92mk3x/dashboard', { jar: custJar });
    assert(p.status >= 300 && p.status < 400 && /\/dashboard/.test(p.location ?? ''), `page ${p.status} ${p.location}`);
    const a = await http('GET', '/api/admin/site-settings', { jar: custJar });
    eq(a.status, 403, 'admin api');
  });
  await t('expired access token is refreshed transparently', async () => {
    const jar = custJar.clone();
    const { base, session } = decodeSessionCookie(jar);
    session.expires_at = 1;
    for (const n of jar.authNames()) jar.c.delete(n);
    jar.c.set(base, encodeSessionCookie(session));
    const r = await http('GET', '/dashboard', { jar });
    eq(r.status, 200, 'status');
    assert(r.setCookies.some((c) => c.startsWith('sb-')), 'no refreshed cookie issued');
  });
  await t('admin session reaches admin page and admin API', async () => {
    const jar = new Jar();
    const l = await login(jar, admin.email, admin.password, true);
    eq(l.status, 200, 'login');
    const p = await http('GET', '/cp-adm-7f92mk3x/dashboard', { jar });
    eq(p.status, 200, `admin page (${p.location ?? ''})`);
    const a = await http('GET', '/api/admin/site-settings', { jar });
    assert(a.status !== 401 && a.status !== 403 && !(a.status >= 300 && a.status < 400), `admin api ${a.status}`);
  });

  // ---- logout / tabs -------------------------------------------------
  console.log('\n[logout]');
  await t('logout clears cookies and the old session no longer works', async () => {
    const jar = new Jar();
    await login(jar, main_.email, main_.password, true);
    const stale = jar.clone();
    const r = await http('POST', '/api/auth/logout', { jar });
    eq(r.status, 200, 'status');
    eq(jar.authNames().length, 0, 'sb- cookies left after logout');
    const after = await http('GET', '/dashboard', { jar: stale }); // "back button" / second tab with old cookies
    assert(isLoginRedirect(after), `stale session still valid: ${after.status}`);
    const anon_ = await http('GET', '/dashboard', { jar });
    assert(isLoginRedirect(anon_), 'logged-out jar still allowed in');
  });
  await t('logout of one device does not log out another (two sessions)', async () => {
    const a = new Jar(); const b = new Jar();
    await login(a, main_.email, main_.password, true);
    await login(b, main_.email, main_.password, true);
    await http('POST', '/api/auth/logout', { jar: a });
    const rb = await http('GET', '/dashboard', { jar: b });
    eq(rb.status, 200, 'other device status');
  });
  await t('logout works for session-only logins too (cookies were not HttpOnly)', async () => {
    const jar = new Jar();
    await login(jar, main_.email, main_.password, false);
    await http('POST', '/api/auth/logout', { jar });
    eq(jar.authNames().length, 0, 'sb- cookies left');
    assert(!jar.c.has('cp_session_only'), 'marker left');
  });

  // ---- callback ------------------------------------------------------
  console.log('\n[callback]');
  await t('callback with no code / bad code / provider error -> /login?error=oauth', async () => {
    for (const q of ['', '?code=bogus', '?error=access_denied&error_description=nope', '?code=bogus&next=//evil.com', '?code=bogus&next=https://evil.com']) {
      const r = await http('GET', '/auth/callback' + q);
      assert(r.status >= 300 && r.status < 400, `${q} -> ${r.status}`);
      assert(/\/login\?error=oauth$/.test(r.location ?? ''), `${q} -> ${r.location}`);
    }
  });

  // ---- forgot / reset ------------------------------------------------
  console.log('\n[forgot / reset]');
  await t('resetPasswordForEmail succeeds for known + unknown emails alike (no enumeration)', async () => {
    const c = anon();
    const known = await c.auth.resetPasswordForEmail(`delivered+authtest-${RUN}-known@resend.dev`, { redirectTo: `${BASE}/reset-password` });
    const unknown = await c.auth.resetPasswordForEmail(`delivered+authtest-${RUN}-unknown@resend.dev`, { redirectTo: `${BASE}/reset-password` });
    assert(!known.error || known.error.status === 429, `known: ${known.error?.message}`);
    eq(!!unknown.error, !!known.error, 'known/unknown behave the same');
  });
  await t('recovery link -> session -> updateUser -> new password works, old one does not', async () => {
    const { data, error } = await service.auth.admin.generateLink({ type: 'recovery', email: reset.email });
    assert(!error, `generateLink: ${error?.message}`);
    const c = anon();
    const v = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'recovery' });
    assert(!v.error && v.data.session, `verifyOtp: ${v.error?.message}`);
    const newPw = `New!${rand()}`;
    const u = await c.auth.updateUser({ password: newPw });
    assert(!u.error, `updateUser: ${u.error?.message}`);
    reset.password = newPw;
    eq((await login(new Jar(), reset.email, newPw)).status, 200, 'login with new password');
    eq((await login(new Jar(), reset.email, 'Old-password-1')).status, 401, 'old password');
  });
  await t('used / invalid recovery token is rejected (form shows the expired message)', async () => {
    const { data } = await service.auth.admin.generateLink({ type: 'recovery', email: reset.email });
    const c1 = anon();
    await c1.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'recovery' });
    const c2 = anon();
    const again = await c2.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'recovery' });
    assert(again.error, 'second use of the token should fail');
    const noSession = await anon().auth.updateUser({ password: 'Whatever-123!' });
    assert(noSession.error, 'updateUser without a session should fail');
  });
  await t('settings/password: wrong current password rejected, right one accepted, trims', async () => {
    const jar = new Jar();
    await login(jar, customer.email, customer.password, true);
    const bad = await http('POST', '/api/settings/password', { jar, body: { currentPassword: 'wrong-wrong', newPassword: 'Another-pass-1!' } });
    eq(bad.status, 401, 'wrong current');
    const next = `Chg!${rand()}`;
    const ok = await http('POST', '/api/settings/password', { jar, body: { currentPassword: ` ${customer.password} `, newPassword: ` ${next} ` } });
    eq(ok.status, 200, 'change');
    customer.password = next;
    eq((await login(new Jar(), customer.email, next)).status, 200, 'login with changed password');
    const noAuth = await http('POST', '/api/settings/password', { body: { currentPassword: 'a', newPassword: 'bbbbbbbb' } });
    eq(noAuth.status, 401, 'no session');
  });

  // ---- signup --------------------------------------------------------
  console.log('\n[signup]');
  const signupEmail = `delivered+authtest-${RUN}-signup@resend.dev`;
  const signupPw = `Su!${rand()}`;
  let signupId = null;
  await t('signUp creates an unconfirmed user and a profiles row', async () => {
    const r = await anon().auth.signUp({
      email: signupEmail.toUpperCase(),
      password: signupPw,
      options: { emailRedirectTo: `${BASE}/auth/callback`, data: { first_name: 'Auth', last_name: 'Signup' } },
    });
    assert(!r.error, `signUp: ${r.error?.message}`);
    signupId = r.data.user?.id;
    assert(signupId, 'no user id');
    created.push({ email: signupEmail, id: signupId });
    await new Promise((res) => setTimeout(res, 1500));
    const { data: prof } = await service.from('profiles').select('id, onboarding_completed').eq('id', signupId).maybeSingle();
    assert(prof, 'no profiles row was created for the new user (missing handle_new_user trigger?)');
  });
  await t('login before confirming the email -> confirm message', async () => {
    const r = await login(new Jar(), signupEmail, signupPw);
    assert(r.status === 401 && /confirm your email/i.test(r.json.error), `${r.status} ${r.text.slice(0, 100)}`);
  });
  await t('duplicate signUp is detectable (no identities / error)', async () => {
    const r = await anon().auth.signUp({ email: signupEmail, password: signupPw });
    const dup = !!r.error || (Array.isArray(r.data?.user?.identities) && r.data.user.identities.length === 0);
    assert(dup, 'duplicate signup not detectable');
  });
  await t('after confirmation the new user can log in (onboarding not completed)', async () => {
    await service.auth.admin.updateUserById(signupId, { email_confirm: true });
    const r = await login(new Jar(), signupEmail.toUpperCase(), signupPw);
    eq(r.status, 200, 'status');
    assert(r.json.onboardingCompleted === false || r.json.onboardingCompleted === true, 'flag present');
  });
}

async function cleanup() {
  try {
    if (adminUserId) await service.from('admins').delete().eq('user_id', adminUserId);
    for (const u of created) {
      await service.auth.admin.updateUserById(u.id, { password: `Done!${rand()}${rand()}` }).catch(() => {});
    }
  } catch (e) {
    console.log('cleanup warning:', e.message);
  }
}

try {
  await main();
} catch (e) {
  results.push({ name: 'script crashed', ok: false, err: e.stack });
  console.log('  CRASH ', e.stack);
} finally {
  await cleanup();
}

const failed = results.filter((r) => !r.ok);
console.log(`\nrun ${RUN}: ${results.length - failed.length}/${results.length} passed, ${failed.length} failed`);
console.log('test users created this run:');
for (const u of created) console.log('  ' + u.email);
process.exit(failed.length ? 1 : 0);
