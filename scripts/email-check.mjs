// Email check.
//
// Local end-to-end (real routes, Resend replaced by a file):
//   EMAIL_DRY_RUN_FILE=<file> npx next start -p 3100     (in one terminal)
//   EMAIL_DRY_RUN_FILE=<file> BASE=http://localhost:3100 node scripts/email-check.mjs
//
// Live Resend check (admin test user sends one real mail to delivered@resend.dev):
//   BASE=https://www.claimpointsolutions.com LIVE=1 node scripts/email-check.mjs
//
// Uses throwaway users (authtest+email-*), randomises their passwords at the end.

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { deliverEmail, isCategoryEnabled } from '../src/lib/email/deliver.js';

const BASE = (process.env.BASE || 'http://localhost:3100').replace(/\/$/, '');
const FILE = process.env.EMAIL_DRY_RUN_FILE;
const LIVE = process.env.LIVE === '1';

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const results = [];
const t = async (name, fn) => {
  try { await fn(); results.push(true); console.log('  PASS ', name); }
  catch (e) { results.push(false); console.log('  FAIL ', name, '\n        ', e.message); }
};
const assert = (c, m) => { if (!c) throw new Error(m); };
const rand = () => randomBytes(8).toString('hex');
const RUN = Date.now().toString(36);

class Jar {
  constructor() { this.c = new Map(); }
  header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join('; '); }
  absorb(res) {
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = raw.split(';').map((s) => s.trim());
      const i = pair.indexOf('=');
      const n = pair.slice(0, i), v = pair.slice(i + 1);
      const ma = attrs.find((a) => /^max-age=/i.test(a));
      if ((ma && Number(ma.split('=')[1]) <= 0) || v === '') this.c.delete(n); else this.c.set(n, v);
    }
  }
}
async function req(method, p, { jar, json } = {}) {
  const res = await fetch(BASE + p, {
    method, redirect: 'manual',
    headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(jar ? { Cookie: jar.header() } : {}) },
    body: json !== undefined ? JSON.stringify(json) : undefined,
    signal: AbortSignal.timeout(120000),
  });
  jar?.absorb(res);
  const text = await res.text();
  let body = null; try { body = JSON.parse(text); } catch {}
  return { status: res.status, text, json: body };
}
async function login(email, password) {
  const jar = new Jar();
  for (let i = 0; i < 10; i++) {
    const r = await req('POST', '/api/auth/login', { jar, json: { email, password, rememberMe: true } });
    if (r.status === 429 && !/Too many/.test(r.text)) { await new Promise((x) => setTimeout(x, 30000)); continue; }
    if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${r.text}`);
    return jar;
  }
  throw new Error('rate limited');
}
async function mkUser(tag, { admin = false, email } = {}) {
  email = email ?? `authtest+email-${RUN}-${tag}@example.com`;
  const password = `Em!${rand()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: 'Email', last_name: tag } });
  if (error) throw new Error(error.message);
  await new Promise((r) => setTimeout(r, 1200));
  await service.from('profiles').update({ onboarding_completed: true }).eq('id', data.user.id);
  if (admin) await service.from('admins').upsert({ user_id: data.user.id, role: 'admin' });
  return { id: data.user.id, email, password };
}
const sent = () => (FILE && fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const mark = () => sent().length;
const since = (n, to) => sent().slice(n).filter((m) => !to || m.to === to);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const setPrefs = (jar, prefs) => req('PATCH', '/api/settings/profile', { jar, json: { notificationPreferences: prefs } });
const ALL_ON = { email_transactions: true, email_claims: true, email_security: true, email_marketing: true };

const cleanup = [];
try {
  console.log('\n[unit] toggle logic (mocked transport)');
  await t('categories default and respond to toggles', async () => {
    assert(isCategoryEnabled(null, 'transactions') && isCategoryEnabled({}, 'claims') && isCategoryEnabled(undefined, 'security'), 'defaults on');
    assert(!isCategoryEnabled(null, 'marketing'), 'marketing default off');
    assert(isCategoryEnabled({ email_marketing: true }, 'marketing'), 'marketing on');
    for (const [cat, key] of [['transactions', 'email_transactions'], ['claims', 'email_claims'], ['security', 'email_security'], ['marketing', 'email_marketing']]) {
      const calls = [];
      const send = async (m) => { calls.push(m); return { data: { id: 'x' } }; };
      const off = await deliverEmail({ to: 'a@b.c', category: cat, subject: 's', html: 'h', prefs: { [key]: false }, send });
      const on = await deliverEmail({ to: 'a@b.c', category: cat, subject: 's', html: 'h', prefs: { [key]: true }, send });
      assert(off.status === 'skipped' && on.status === 'sent' && calls.length === 1, `${cat}: off=${off.status} on=${on.status}`);
    }
    const failed = await deliverEmail({ to: 'a@b.c', category: 'claims', subject: 's', html: 'h', prefs: {}, send: async () => ({ error: 'boom' }) });
    assert(failed.status === 'failed', 'failure reported, not thrown');
    const threw = await deliverEmail({ to: 'a@b.c', category: 'claims', subject: 's', html: 'h', prefs: {}, send: async () => { throw new Error('x'); } });
    assert(threw.status === 'failed', 'exception swallowed');
  });

  console.log('\n[auth emails] signup confirmation + password reset (Supabase SMTP -> Resend)');
  await t('signUp confirmation email is accepted by Supabase SMTP', async () => {
    const r = await anon.auth.signUp({ email: `delivered+authtest-email-${RUN}@resend.dev`, password: `Su!${rand()}` });
    assert(!r.error, `signUp error (SMTP failing?): ${r.error?.message}`);
    cleanup.push(r.data.user?.id);
  });
  await t('password reset email is accepted by Supabase SMTP', async () => {
    const u = await mkUser('reset', { email: `delivered+authtest-emailreset-${RUN}@resend.dev` });
    cleanup.push(u.id);
    const r = await anon.auth.resetPasswordForEmail(u.email, { redirectTo: `${BASE}/reset-password` });
    assert(!r.error, `reset error (SMTP failing?): ${r.error?.message}`);
  });

  if (LIVE) {
    console.log('\n[live] real Resend send from the deployed app');
    const admin = await mkUser('admin', { admin: true });
    cleanup.push(admin.id);
    const jar = await login(admin.email, admin.password);
    await t('POST /api/admin/email-check delivers to delivered@resend.dev', async () => {
      const r = await req('POST', '/api/admin/email-check', { jar, json: { to: 'delivered@resend.dev' } });
      console.log('        ', JSON.stringify({ status: r.status, ...r.json }));
      assert(r.status === 200 && r.json?.ok, `send failed: ${r.text}`);
    });
    await service.from('admins').delete().eq('user_id', admin.id);
  } else {
    assert(FILE, 'set EMAIL_DRY_RUN_FILE (server and script) for the local end-to-end run');
    fs.writeFileSync(FILE, '');
    console.log('\n[end-to-end] real routes, mail captured to file');
    const cust = await mkUser('cust');
    const adm = await mkUser('admin', { admin: true });
    cleanup.push(cust.id, adm.id);
    await service.from('profiles').update({ verification_status: 'verified' }).eq('id', cust.id);
    const { data: accs } = await service.from('accounts').select('id').eq('user_id', cust.id);
    await service.from('accounts').update({ available_balance: 1000 }).eq('id', accs[0].id);

    let n = mark();
    const jc = await login(cust.email, cust.password);
    const jadm = await login(adm.email, adm.password);
    await wait(2500);
    await t('security alert: new login sends an email', async () => {
      const m = since(n, cust.email);
      assert(m.length === 1 && /New login/.test(m[0].subject), `got ${JSON.stringify(m.map((x) => x.subject))}`);
      assert(/^ClaimPoint Solutions </.test(m[0].from), 'from ' + m[0].from);
    });
    n = mark();
    await login(cust.email, cust.password); await wait(2000);
    await t('security alert: a second login within 10 minutes is not re-announced', async () => assert(since(n, cust.email).length === 0, 'unexpected second alert'));

    await t('security alerts toggle OFF stops password-change email, ON restores it', async () => {
      assert((await setPrefs(jc, { ...ALL_ON, email_security: false })).status === 200, 'prefs save');
      n = mark();
      let newPw = `Chg!${rand()}`;
      let r = await req('POST', '/api/settings/password', { jar: jc, json: { currentPassword: cust.password, newPassword: newPw } });
      assert(r.status === 200, 'password change ' + r.text);
      cust.password = newPw;
      assert(since(n, cust.email).length === 0, 'email sent while toggle off');
      assert((await setPrefs(jc, ALL_ON)).status === 200, 'prefs save on');
      n = mark();
      newPw = `Chg!${rand()}`;
      r = await req('POST', '/api/settings/password', { jar: jc, json: { currentPassword: cust.password, newPassword: newPw } });
      cust.password = newPw;
      const m = since(n, cust.email);
      assert(m.length === 1 && /password was changed/.test(m[0].subject), `got ${JSON.stringify(m.map((x) => x.subject))}`);
    });

    let claimId;
    await t('claim update: new claim sends an email', async () => {
      n = mark();
      const r = await req('POST', '/api/claims', { jar: jc, json: { category: 'Email test', details: 'Email test claim details', evidenceFileIds: [] } });
      assert(r.status < 300, 'claim ' + r.text);
      claimId = r.json?.claim?.id ?? r.json?.id;
      const m = since(n, cust.email);
      assert(m.length === 1 && /received/.test(m[0].subject), `got ${JSON.stringify(m.map((x) => x.subject))}`);
    });
    await t('claim update: admin status change sends an email; toggle OFF stops it', async () => {
      n = mark();
      let r = await req('PATCH', `/api/admin/claims/${claimId}/status`, { jar: jadm, json: { status: 'under_review' } });
      assert(r.status === 200, 'status ' + r.text);
      let m = since(n, cust.email);
      assert(m.length === 1 && /Update on claim/.test(m[0].subject), `got ${JSON.stringify(m.map((x) => x.subject))}`);
      await setPrefs(jc, { ...ALL_ON, email_claims: false });
      n = mark();
      r = await req('PATCH', `/api/admin/claims/${claimId}/status`, { jar: jadm, json: { status: 'in_progress' } });
      assert(since(n, cust.email).length === 0, 'email sent while claims toggle off');
    });
    await t('claim update: admin comment sends an email (claims ON), escaped', async () => {
      await setPrefs(jc, ALL_ON);
      n = mark();
      const r = await req('POST', `/api/admin/claims/${claimId}/comments`, { jar: jadm, json: { message: 'Hello <b>there</b>' } });
      assert(r.status < 300, 'comment ' + r.text);
      const m = since(n, cust.email);
      assert(m.length === 1 && /Update on your claim/.test(m[0].subject), `got ${JSON.stringify(m.map((x) => x.subject))}`);
      assert(!/<b>there<\/b>/.test(m[0].html) && /&lt;b&gt;/.test(m[0].html), 'message not escaped');
    });

    await t('transaction email: withdrawal sends an email; toggle OFF stops it', async () => {
      n = mark();
      let r = await req('POST', '/api/transactions/withdrawal', { jar: jc, json: { amount: '5', accountId: accs[0].id, destination: 'Test Bank 1234' } });
      assert(r.status === 201, `withdrawal ${r.status} ${r.text.slice(0, 160)}`);
      let m = since(n, cust.email);
      assert(m.length === 1 && /Withdrawal confirmation/.test(m[0].subject), `got ${JSON.stringify(m.map((x) => x.subject))}`);
      await setPrefs(jc, { ...ALL_ON, email_transactions: false });
      n = mark();
      r = await req('POST', '/api/transactions/withdrawal', { jar: jc, json: { amount: '5', accountId: accs[0].id, destination: 'Test Bank 1234' } });
      assert(r.status === 201, 'second withdrawal ' + r.status);
      assert(since(n, cust.email).length === 0, 'email sent while transactions toggle off');
      await setPrefs(jc, ALL_ON);
    });
    await t('transaction email: transfer sends an email', async () => {
      n = mark();
      const r = await req('POST', '/api/transactions/transfer', { jar: jc, json: { amount: '5', fromAccountId: accs[0].id, transferType: 'external', externalBankName: 'Test Bank', externalAccountNumber: '000011112222' } });
      if (r.status !== 201) { console.log('        transfer not accepted by the app here:', r.status, r.text.slice(0, 160)); }
      assert(r.status === 201, `transfer ${r.status}`);
      const m = since(n, cust.email);
      assert(m.length === 1 && /Transfer confirmation/.test(m[0].subject), `got ${JSON.stringify(m.map((x) => x.subject))}`);
    });

    await t('product update: only customers with the toggle ON are mailed', async () => {
      await setPrefs(jc, { ...ALL_ON, email_marketing: false });
      let dry = await req('POST', '/api/admin/product-updates', { jar: jadm, json: { subject: 'S', message: 'M', dryRun: true } });
      const before = dry.json.recipients;
      await setPrefs(jc, ALL_ON);
      dry = await req('POST', '/api/admin/product-updates', { jar: jadm, json: { subject: 'S', message: 'M', dryRun: true } });
      assert(dry.json.recipients === before + 1, `recipients ${before} -> ${dry.json.recipients}`);
      // real send, mail goes to the capture file only
      n = mark();
      const r = await req('POST', '/api/admin/product-updates', { jar: jadm, json: { subject: 'Email test update', message: 'Line one\nLine two' } });
      assert(r.status === 200 && r.json.sent >= 1, 'send ' + r.text);
      assert(since(n, cust.email).length === 1, 'customer with toggle on did not get the update');
      await setPrefs(jc, { ...ALL_ON, email_marketing: false });
      n = mark();
      await req('POST', '/api/admin/product-updates', { jar: jadm, json: { subject: 'Email test update 2', message: 'x' } });
      assert(since(n, cust.email).length === 0, 'customer with toggle off was mailed');
    });
    await t('product update endpoint is admin only', async () => {
      const r = await req('POST', '/api/admin/product-updates', { jar: jc, json: { subject: 'S', message: 'M' } });
      assert(r.status === 403, 'status ' + r.status);
    });
    await t('no verification/welcome emails are sent any more', async () => {
      const subjects = sent().map((m) => m.subject);
      assert(!subjects.some((s) => /Verification|Welcome/i.test(s)), subjects.join(' | '));
    });
    await service.from('admins').delete().eq('user_id', adm.id);
  }
} catch (e) {
  results.push(false);
  console.log('CRASH', e.stack);
} finally {
  for (const id of cleanup.filter(Boolean)) await service.auth.admin.updateUserById(id, { password: `Done!${rand()}${rand()}` }).catch(() => {});
}
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
