// Phase 2 audit: exercises every page and API route with real requests as
// anonymous / customer / second customer / admin, plus RLS probes with a
// customer JWT. REPORT ONLY - it records results to audit-results.json and
// never touches the money-adding flow (deposit, card-deposit, admin fund).
//
//   BASE=http://localhost:3100 node scripts/audit-check.mjs

import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BASE = (process.env.BASE || 'http://localhost:3100').replace(/\/$/, '');
const ADMIN = '/cp-adm-7f92mk3x';

for (const line of fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const service = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

class Jar {
  constructor() { this.c = new Map(); }
  header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join('; '); }
  absorb(res) {
    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = raw.split(';').map((s) => s.trim());
      const i = pair.indexOf('=');
      const name = pair.slice(0, i), value = pair.slice(i + 1);
      const ma = attrs.find((a) => /^max-age=/i.test(a));
      if ((ma && Number(ma.split('=')[1]) <= 0) || value === '') this.c.delete(name); else this.c.set(name, value);
    }
  }
}
async function req(method, p, { jar, json, form, headers = {}, follow = 0 } = {}) {
  let url = p.startsWith('http') ? p : BASE + p;
  for (let hop = 0; hop <= follow; hop++) {
    const res = await fetch(url, {
      method: hop === 0 ? method : 'GET',
      redirect: 'manual',
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(jar?.header() ? { Cookie: jar.header() } : {}), ...headers },
      body: hop === 0 ? (json !== undefined ? JSON.stringify(json) : form) : undefined,
      signal: AbortSignal.timeout(120000),
    });
    jar?.absorb(res);
    const loc = res.headers.get('location');
    if (loc && hop < follow && res.status >= 300 && res.status < 400) { url = new URL(loc, url).toString(); continue; }
    const text = await res.text();
    let body = null; try { body = JSON.parse(text); } catch {}
    return { status: res.status, location: loc, text, json: body, finalUrl: url };
  }
}
async function login(email, password) {
  const jar = new Jar();
  for (let i = 0; i < 10; i++) {
    const r = await req('POST', '/api/auth/login', { jar, json: { email, password, rememberMe: true } });
    if (r.status === 429 && !/Too many attempts/.test(r.json?.error ?? '')) { await new Promise((x) => setTimeout(x, 30000)); continue; }
    if (r.status !== 200) throw new Error(`login ${email}: ${r.status} ${r.text}`);
    return jar;
  }
  throw new Error('login rate limited');
}

const rows = [];
const add = (area, target, test, result, detail = '') => {
  rows.push({ area, target, test, result, detail: String(detail).slice(0, 300) });
};
const RUN = Date.now().toString(36);
const rand = () => randomBytes(8).toString('hex');

async function mkUser(tag, admin = false) {
  const email = `authtest+audit-${RUN}-${tag}@example.com`;
  const password = `Au!${rand()}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { first_name: 'Audit', last_name: tag } });
  if (error) throw new Error(error.message);
  await new Promise((r) => setTimeout(r, 1200));
  await service.from('profiles').update({ onboarding_completed: true }).eq('id', data.user.id);
  if (admin) await service.from('admins').upsert({ user_id: data.user.id, role: 'admin' });
  return { email, password, id: data.user.id };
}

const BAD = /Application error|Internal Server Error|digest|\[object Object\]|>undefined<|>NaN<|NaN%|\$NaN|Cannot read prop|is not defined|Unhandled Runtime Error/;

async function main() {
  console.log('audit run', RUN, BASE);
  const A = await mkUser('custA');
  const B = await mkUser('custB');
  const AD = await mkUser('admin', true);
  const jA = await login(A.email, A.password);
  const jB = await login(B.email, B.password);
  const jAD = await login(AD.email, AD.password);
  const anon = new Jar();

  // ---- seed data for dynamic routes (test rows only) -----------------
  const { data: accsA } = await service.from('accounts').select('*').eq('user_id', A.id);
  add('data', 'new user -> accounts', 'accounts auto-created for a new signup', accsA?.length ? 'works' : 'broken', `rows=${accsA?.length ?? 0} ${(accsA ?? []).map((a) => a.account_type ?? a.type).join(',')}`);
  const { data: accsB } = await service.from('accounts').select('*').eq('user_id', B.id);

  // ---- 1. pages ------------------------------------------------------
  const publicPages = ['/', '/about', '/banking', '/contact', '/disclosures', '/help', '/how-it-works', '/privacy', '/recovery', '/security', '/terms', '/login', '/signup', '/forgot-password', '/reset-password', '/robots.txt', '/sitemap.xml', '/manifest.json', '/sw.js'];
  const customerPages = ['/dashboard', '/accounts', '/activity', '/beneficiaries', '/claims', '/claims/new', '/deposits', '/documents', '/notifications', '/referrals', '/savings', '/settings', '/support', '/transfers', '/withdrawals', '/onboarding', '/verify'];
  const adminPages = ['dashboard', 'audit-log', 'business-settings', 'chat', 'claims', 'customers', 'financial-config', 'partners', 'products', 'testimonials', 'verification'].map((p) => `${ADMIN}/${p}`);
  const links = new Map(); // href -> source page
  const harvest = (html, src) => {
    for (const m of html.matchAll(/href="(\/[^"#?]*(?:\?[^"#]*)?)"/g)) {
      const h = m[1];
      if (h.startsWith('/_next') || h.startsWith('//') || /\.(png|jpg|svg|ico|css|js|webp|woff2?)$/.test(h)) continue;
      if (!links.has(h)) links.set(h, src);
    }
  };
  const sweep = async (pages, jar, label) => {
    for (const p of pages) {
      try {
        const r = await req('GET', p, { jar, follow: 3 });
        const text = r.text;
        const visible = text.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const bad = text.match(BAD)?.[0];
        const title = (text.match(/<title[^>]*>([^<]*)/) || [])[1] ?? '';
        let result = 'works';
        let detail = `${r.status} title="${title}" visibleChars=${visible.length}`;
        if (r.status >= 400) result = 'broken';
        else if (bad) { result = 'broken'; detail += ` contains "${bad}"`; }
        else if (visible.length < 150 && p !== '/reset-password' && !/\.(txt|xml|json|js)$/.test(p)) { result = 'unfinished'; detail += ' (nearly empty)'; }
        if (new URL(r.finalUrl).pathname !== p.split('?')[0]) detail += ` finalUrl=${new URL(r.finalUrl).pathname}`;
        add(label, p, 'GET page', result, detail);
        if (r.status < 400 && /html/.test(text.slice(0, 200) + '<html')) harvest(text, p);
      } catch (e) { add(label, p, 'GET page', 'broken', e.message); }
    }
  };
  await sweep(publicPages, anon, 'page/public');
  await sweep(customerPages, jA, 'page/customer');
  await sweep(adminPages, jAD, 'page/admin');

  // dynamic pages with real ids
  const { data: claimA } = await (async () => {
    const r = await req('POST', '/api/claims', { jar: jA, json: { category: 'Audit test claim', details: 'Audit test claim details for route checks.', evidenceFileIds: [] } });
    add('api', 'POST /api/claims', 'create claim as customer', r.status === 201 || r.status === 200 ? 'works' : 'broken', `${r.status} ${r.text.slice(0, 160)}`);
    return { data: r.json?.claim ?? r.json };
  })();
  const claimId = claimA?.id ?? claimA?.claim?.id;
  if (claimId) {
    await sweep([`/claims/${claimId}`], jA, 'page/customer');
    const rB = await req('GET', `/claims/${claimId}`, { jar: jB, follow: 3 });
    add('security', `/claims/${claimId}`, "customer B opens customer A's claim page", /Audit test claim details/.test(rB.text) ? 'broken' : 'works', `${rB.status}`);
    await sweep([`${ADMIN}/customers/${A.id}`], jAD, 'page/admin');
  } else add('page/customer', '/claims/[id]', 'dynamic page', 'untested', 'no claim id returned from POST /api/claims');

  // ---- 2. internal links ---------------------------------------------
  const checked = [];
  for (const [href, src] of links) {
    const jar = href.startsWith(ADMIN) || href.startsWith('/api/admin') ? jAD : jA;
    try {
      const r = await req('GET', href, { jar, follow: 3 });
      checked.push([href, r.status]);
      if (r.status >= 400) add('link', href, `linked from ${src}`, 'broken', `status ${r.status}`);
    } catch (e) { add('link', href, `linked from ${src}`, 'broken', e.message); }
  }
  add('link', `${links.size} unique internal links`, 'crawl of links found on swept pages', checked.every(([, s]) => s < 400) ? 'works' : 'broken', checked.filter(([, s]) => s >= 400).map((c) => c.join(':')).join(' '));

  // ---- 3. API: access control matrix ---------------------------------
  const routes = fs.readFileSync(path.resolve(process.cwd(), 'scripts/.routes.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
  const SKIP = /^(\w+) \/api\/(transactions\/deposit|transactions\/card-deposit|admin\/accounts\/.*\/fund)/;
  for (const line of routes) {
    const [method, route] = line.split(' ');
    if (SKIP.test(line)) { add('api/access', `${method} ${route}`, 'all', 'skipped', 'money-adding flow excluded by instruction'); continue; }
    if (route === '/api/settings/request-deletion') continue; // signs the caller out; exercised last
    if (route.startsWith('/api/auth') || route.startsWith('/api/health') || route === '/api/keep-alive') continue;
    const url = route.replace(/\[id\]/g, '00000000-0000-0000-0000-000000000000');
    const isAdmin = route.startsWith('/api/admin');
    const opts = (jar) => ({ jar, ...(method === 'GET' ? {} : { json: {} }) });
    const rAnon = await req(method, url, opts(anon));
    const rCust = await req(method, url, opts(jA));
    const ok401 = rAnon.status === 401 || rAnon.status === 403 || (rAnon.status >= 300 && rAnon.status < 400);
    add('api/access', `${method} ${route}`, 'anonymous is refused', ok401 ? 'works' : 'broken', `status ${rAnon.status}`);
    if (isAdmin) add('api/access', `${method} ${route}`, 'customer is refused', [401, 403].includes(rCust.status) || (rCust.status >= 300 && rCust.status < 400) ? 'works' : 'broken', `status ${rCust.status}`);
    const rAd = isAdmin ? await req(method, url, opts(jAD)) : rCust;
    const who = isAdmin ? 'admin' : 'customer';
    const r5 = rAd.status >= 500;
    add('api/probe', `${method} ${route}`, `${who} with empty/invalid input`, r5 ? 'broken' : 'works', `status ${rAd.status} ${rAd.text.slice(0, 100).replace(/\s+/g, ' ')}`);
  }

  // ---- 4. API happy paths as customer --------------------------------
  const step = async (area, name, fn) => {
    try { const [ok, detail] = await fn(); add(area, name, 'happy path', ok ? 'works' : 'broken', detail); }
    catch (e) { add(area, name, 'happy path', 'broken', e.message); }
  };
  await step('api/customer', 'PATCH /api/settings/profile', async () => {
    const r = await req('PATCH', '/api/settings/profile', { jar: jA, json: { firstName: 'Audit', lastName: 'CustA', phone: '+15550001111', country: 'US', streetAddress: '1 Audit St' } });
    const { data: p } = await service.from('profiles').select('phone,street_address,first_name').eq('id', A.id).single();
    return [r.status === 200 && p.phone === '+15550001111', `${r.status} saved phone=${p?.phone} street=${p?.street_address} ${r.text.slice(0, 100)}`];
  });
  await step('api/customer', 'GET /api/settings/export-data', async () => { const r = await req('GET', '/api/settings/export-data', { jar: jA }); return [r.status === 200, `${r.status} bytes=${r.text.length}`]; });
  await step('api/customer', 'GET /api/notifications', async () => { const r = await req('GET', '/api/notifications', { jar: jA }); return [r.status === 200, `${r.status} ${r.text.slice(0, 100)}`]; });
  let benId;
  await step('api/customer', 'POST /api/beneficiaries', async () => {
    const r = await req('POST', '/api/beneficiaries', { jar: jA, json: { nickname: 'Audit Ben', bankName: 'Audit Bank', accountLast4: '1234' } });
    benId = r.json?.beneficiary?.id ?? r.json?.id;
    const { data } = await service.from('beneficiaries').select('id').eq('user_id', A.id);
    return [r.status < 300 && data?.length > 0, `${r.status} rows=${data?.length} ${r.text.slice(0, 120)}`];
  });
  await step('security', 'DELETE /api/beneficiaries/[id] (customer B on A)', async () => {
    if (!benId) return [false, 'no beneficiary id to test'];
    const r = await req('DELETE', `/api/beneficiaries/${benId}`, { jar: jB });
    const { data } = await service.from('beneficiaries').select('id').eq('id', benId);
    return [data?.length === 1, `status ${r.status}; beneficiary still exists=${data?.length === 1}`];
  });
  await step('api/customer', 'GET /api/chat/conversations + POST /api/chat/messages', async () => {
    const c = await req('GET', '/api/chat/conversations', { jar: jA });
    const cid = c.json?.conversations?.[0]?.id ?? c.json?.conversation?.id ?? c.json?.id;
    if (!cid) return [c.status === 200, `conversations ${c.status} ${c.text.slice(0, 120)} (no conversation id; POST not exercised)`];
    const m = await req('POST', '/api/chat/messages', { jar: jA, json: { conversationId: cid, message: 'Audit hello' } });
    const g = await req('GET', `/api/chat/messages?conversationId=${cid}`, { jar: jA });
    const gB = await req('GET', `/api/chat/messages?conversationId=${cid}`, { jar: jB });
    add('security', 'GET /api/chat/messages', "customer B reads customer A's conversation", /Audit hello/.test(gB.text) ? 'broken' : 'works', `status ${gB.status}`);
    return [m.status < 300 && g.status === 200 && /Audit hello/.test(g.text), `post ${m.status}, get ${g.status}`];
  });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const mkForm = (fields, file) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.append(k, v); if (file) f.append(file.name, new Blob([png], { type: 'image/png' }), 'audit.png'); return f; };
  let evId;
  await step('api/customer', 'POST /api/claims/evidence', async () => {
    const r = await req('POST', '/api/claims/evidence', { jar: jA, form: mkForm({}, { name: 'file' }) });
    evId = r.json?.id ?? r.json?.evidence?.id;
    return [r.status < 300, `${r.status} ${r.text.slice(0, 140)}`];
  });
  if (claimId) {
    await step('api/customer', 'POST /api/claims/[id]/cancel (customer B on A)', async () => {
      const r = await req('POST', `/api/claims/${claimId}/cancel`, { jar: jB, json: {} });
      const { data } = await service.from('recovery_cases').select('status').eq('id', claimId).single();
      return [!/cancel/i.test(data?.status ?? ''), `status ${r.status}; claim status=${data?.status}`];
    });
  }
  await step('api/customer', 'POST /api/onboarding', async () => {
    const r = await req('POST', '/api/onboarding', { jar: jA, form: mkForm({ country: 'US', streetAddress: '1 Audit St', phone: '+15550001111' }, { name: 'photo' }) });
    return [r.status < 300, `${r.status} ${r.text.slice(0, 140)}`];
  });
  let vSession;
  const docIds = [];
  await step('api/customer', 'POST /api/verification/documents (front/back/selfie)', async () => {
    const out = [];
    for (const t of ['front', 'back', 'selfie']) {
      const r = await req('POST', '/api/verification/documents', { jar: jA, form: mkForm({ docType: t }, { name: 'file' }) });
      out.push(`${t}:${r.status}`);
      const did = r.json?.document?.id ?? r.json?.id;
      if (did) docIds.push(did);
    }
    return [out.every((s) => /:(200|201)$/.test(s)), out.join(' ')];
  });
  await step('api/customer', 'POST /api/verification (submit)', async () => {
    const r = await req('POST', '/api/verification', { jar: jA, json: { idType: 'drivers_license', personal: { firstName: 'Audit', lastName: 'CustA', dob: '1990-01-01', address: '1 Audit St', city: 'Testville', zip: '00000' }, documentIds: docIds } });
    const { data } = await service.from('verification_sessions').select('id,status').eq('user_id', A.id);
    vSession = data?.[0]?.id;
    return [r.status < 300 && !!vSession, `${r.status} sessions=${data?.length} ${r.text.slice(0, 120)}`];
  });
  if (accsA?.length) {
    await step('security', 'POST /api/accounts/[id]/close (customer B on A)', async () => {
      const r = await req('POST', `/api/accounts/${accsA[0].id}/close`, { jar: jB, json: {} });
      const { data } = await service.from('accounts').select('status').eq('id', accsA[0].id).single();
      return [!/closed/i.test(data?.status ?? ''), `status ${r.status}; account status=${data?.status}`];
    });
  }
  // withdrawal / transfer: validation only, no valid payloads sent
  for (const [rt, body] of [['/api/transactions/withdrawal', { amount: '0', accountId: accsA?.[0]?.id }], ['/api/transactions/transfer', { amount: '0', fromAccountId: accsA?.[0]?.id }]]) {
    const r = await req('POST', rt, { jar: jA, json: body });
    add('api/customer', `POST ${rt}`, 'rejects zero amount (valid payloads not sent)', r.status === 400 ? 'works' : 'broken', `${r.status} ${r.text.slice(0, 100)}`);
  }

  // ---- 5. admin happy paths ------------------------------------------
  await step('api/admin', 'GET /api/admin/notifications', async () => { const r = await req('GET', '/api/admin/notifications', { jar: jAD }); return [r.status === 200, `${r.status}`]; });
  if (claimId) {
    await step('api/admin', 'GET /api/admin/claims/[id]', async () => { const r = await req('GET', `/api/admin/claims/${claimId}`, { jar: jAD }); return [r.status === 200, `${r.status} ${r.text.slice(0, 100)}`]; });
    await step('api/admin', 'PATCH /api/admin/claims/[id]/status', async () => { const r = await req('PATCH', `/api/admin/claims/${claimId}/status`, { jar: jAD, json: { status: 'under_review', notes: 'audit' } }); const { data } = await service.from('recovery_cases').select('status').eq('id', claimId).single(); return [r.status === 200, `${r.status} now=${data?.status} ${r.text.slice(0, 100)}`]; });
    await step('api/admin', 'POST+GET /api/admin/claims/[id]/comments', async () => { const p = await req('POST', `/api/admin/claims/${claimId}/comments`, { jar: jAD, json: { message: 'Audit comment' } }); const g = await req('GET', `/api/admin/claims/${claimId}/comments`, { jar: jAD }); return [p.status < 300 && g.status === 200 && /Audit comment/.test(g.text), `post ${p.status} get ${g.status}`]; });
  }
  if (vSession) {
    await step('api/admin', 'GET /api/admin/verification/[id]/detail', async () => { const r = await req('GET', `/api/admin/verification/${vSession}/detail`, { jar: jAD }); return [r.status === 200 && /front|document/i.test(r.text), `${r.status} bytes=${r.text.length}`]; });
    await step('api/admin', 'PATCH /api/admin/verification/[id] (approve)', async () => { const r = await req('PATCH', `/api/admin/verification/${vSession}`, { jar: jAD, json: { status: 'approved' } }); const { data } = await service.from('profiles').select('verification_status').eq('id', A.id).single(); return [r.status === 200, `${r.status} profile now=${data?.verification_status} ${r.text.slice(0, 100)}`]; });
  }
  await step('api/admin', 'POST/PATCH /api/admin/testimonials', async () => {
    const p = await req('POST', '/api/admin/testimonials', { jar: jAD, json: { customerName: 'Audit Test', quote: 'Audit quote - please delete', isPublished: false } });
    const id = p.json?.testimonial?.id ?? p.json?.id;
    const u = id ? await req('PATCH', `/api/admin/testimonials/${id}`, { jar: jAD, json: { isPublished: false } }) : { status: 'n/a' };
    return [p.status < 300 && u.status === 200, `post ${p.status} patch ${u.status} id=${id} ${p.text.slice(0, 100)}`];
  });
  await step('api/admin', 'POST/PATCH /api/admin/partners', async () => {
    const p = await req('POST', '/api/admin/partners', { jar: jAD, form: mkForm({ name: 'Audit Partner (delete me)' }, { name: 'logo' }) });
    const id = p.json?.partner?.id ?? p.json?.id;
    const u = id ? await req('PATCH', `/api/admin/partners/${id}`, { jar: jAD, json: { isPublished: false } }) : { status: 'n/a' };
    return [p.status < 300 && u.status === 200, `post ${p.status} patch ${u.status} id=${id} ${p.text.slice(0, 100)}`];
  });
  await step('api/admin', 'POST/PATCH /api/admin/products', async () => {
    const p = await req('POST', '/api/admin/products', { jar: jAD, json: { productType: 'savings', name: 'Audit Product (inactive, delete me)', description: 'audit', minAmount: 100, apy: 1 } });
    const id = p.json?.product?.id ?? p.json?.id;
    // products are created 'active' (publicly visible): hide it again straight away
    const u = id ? await req('PATCH', `/api/admin/products/${id}`, { jar: jAD, json: { status: 'inactive' } }) : { status: 'n/a' };
    return [p.status < 300 && u.status === 200, `post ${p.status} patch ${u.status} id=${id} ${p.text.slice(0, 140)}`];
  });
  await step('api/admin', 'PATCH /api/admin/site-settings (same values)', async () => {
    const { data: cur } = await service.from('site_settings').select('*').limit(1).single();
    const r = await req('PATCH', '/api/admin/site-settings', { jar: jAD, json: { companyName: cur.company_name, supportEmail: cur.support_email, supportPhone: cur.support_phone, footerLegalNote: cur.footer_legal_note } });
    const { data: after } = await service.from('site_settings').select('*').limit(1).single();
    return [r.status === 200 && after.company_name === cur.company_name, `${r.status} unchanged=${after.company_name === cur.company_name && after.support_email === cur.support_email} ${r.text.slice(0, 100)}`];
  });
  await step('api/admin', 'GET /api/admin/chat/conversation-messages + POST /api/admin/chat/messages', async () => {
    const { data: conv } = await service.from('chat_conversations').select('id').eq('user_id', A.id).limit(1);
    const cid = conv?.[0]?.id;
    if (!cid) return [true, 'no conversation for test user (customer chat POST may not have created one)'];
    const g = await req('GET', `/api/admin/chat/conversation-messages?conversationId=${cid}`, { jar: jAD });
    const p = await req('POST', '/api/admin/chat/messages', { jar: jAD, json: { conversationId: cid, message: 'Audit admin reply' } });
    return [g.status === 200 && p.status < 300, `get ${g.status} post ${p.status}`];
  });

  await step('api/customer', 'POST /api/settings/request-deletion', async () => {
    const jr = await login(A.email, A.password);
    const r = await req('POST', '/api/settings/request-deletion', { jar: jr, json: {} });
    const after = await req('GET', '/dashboard', { jar: jr });
    return [r.status < 300, `${r.status}; session afterwards: dashboard -> ${after.status}`];
  });

  // ---- 6. RLS probes with a real customer JWT ------------------------
  const sbA = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: sess, error: sErr } = await sbA.auth.signInWithPassword({ email: A.email, password: A.password });
  if (sErr) add('rls', 'customer JWT', 'sign in', 'broken', sErr.message);
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const tables = ['profiles', 'accounts', 'transactions', 'beneficiaries', 'recovery_cases', 'claim_evidence', 'claim_comments', 'verification_sessions', 'verification_documents', 'notifications', 'chat_conversations', 'chat_messages', 'referrals', 'financial_products', 'partners', 'testimonials', 'site_settings', 'system_settings', 'admins', 'admin_notifications', 'audit_log', 'verification_internal_review', 'claim_internal_review', 'login_attempts'];
  for (const t of tables) {
    const own = await sbA.from(t).select('*').limit(50);
    const anonR = await anonClient.from(t).select('*').limit(5);
    const foreign = (own.data ?? []).filter((r) => (r.user_id && r.user_id !== A.id) || (t === 'profiles' && r.id !== A.id));
    const intendedPublic = ['financial_products', 'partners', 'testimonials', 'site_settings'].includes(t);
    const adminOnly = ['admins', 'admin_notifications', 'audit_log', 'verification_internal_review', 'claim_internal_review', 'login_attempts', 'system_settings'].includes(t);
    let res = 'works', det = `customer sees ${own.data?.length ?? 'ERR'} rows${own.error ? ' (' + own.error.message + ')' : ''}; anon sees ${anonR.data?.length ?? 'ERR'}${anonR.error ? ' (' + anonR.error.message + ')' : ''}`;
    if (foreign.length) { res = 'broken'; det += `; LEAK: ${foreign.length} rows belonging to other users`; }
    if (adminOnly && (own.data?.length ?? 0) > 0) { res = 'broken'; det += '; customer can read admin-only table'; }
    if (!intendedPublic && (anonR.data?.length ?? 0) > 0) { res = 'broken'; det += '; anonymous can read private data'; }
    add('rls/select', t, 'read as customer + anonymous', res, det);
  }
  // sensitive writes that must be refused
  const tryWrite = async (name, fn, shouldSucceed) => {
    const r = await fn();
    const wrote = !r.error && (r.data?.length ?? (r.count ?? 0)) > 0;
    add('rls/write', name, shouldSucceed ? 'customer may write own row' : 'customer must NOT be able to write', wrote === shouldSucceed ? 'works' : 'broken', wrote ? 'write succeeded' : (r.error?.message ?? 'no rows changed'));
  };
  await tryWrite('profiles.verification_status', () => sbA.from('profiles').update({ verification_status: 'verified' }).eq('id', A.id).select(), false);
  await tryWrite('profiles.first_name (own)', () => sbA.from('profiles').update({ first_name: 'Audit' }).eq('id', A.id).select(), true);
  if (accsA?.[0]) await tryWrite('accounts.available_balance', () => sbA.from('accounts').update({ available_balance: 999999 }).eq('id', accsA[0].id).select(), false);
  if (claimId) await tryWrite('recovery_cases.status', () => sbA.from('recovery_cases').update({ status: 'recovered' }).eq('id', claimId).select(), false);
  await tryWrite('admins insert', () => sbA.from('admins').insert({ user_id: A.id, role: 'admin' }).select(), false);
  await tryWrite('login_attempts insert', () => sbA.from('login_attempts').insert({ email: 'authtest+x@example.com', success: false }).select(), false);
  await tryWrite('site_settings.company_name', () => sbA.from('site_settings').update({ company_name: 'HACKED' }).neq('id', '00000000-0000-0000-0000-000000000000').select(), false);
  await tryWrite('transactions insert (arbitrary completed)', () => sbA.from('transactions').insert({ user_id: A.id, account_id: accsA?.[0]?.id, type: 'deposit', amount: 100, status: 'completed' }).select(), false);
  await tryWrite('notifications (other user)', () => sbA.from('notifications').update({ is_read: true }).eq('user_id', B.id).select(), false);

  // storage buckets
  for (const b of ['claim-evidence', 'verification-documents', 'partner-logos']) {
    const l = await anonClient.storage.from(b).list('', { limit: 3 });
    add('rls/storage', b, 'anonymous bucket listing', (l.data?.length ?? 0) === 0 ? 'works' : (b === 'partner-logos' ? 'works' : 'broken'), l.error?.message ?? `${l.data?.length} objects visible`);
  }

  // cleanup: neutralise passwords, remove temp admin row
  await service.from('admins').delete().eq('user_id', AD.id);
  for (const u of [A, B, AD]) await service.auth.admin.updateUserById(u.id, { password: `Done!${rand()}${rand()}` });
  console.log('audit users:', A.email, B.email, AD.email);
}

try { await main(); } catch (e) { add('script', 'audit', 'crash', 'broken', e.stack); console.log(e.stack); }
fs.writeFileSync('audit-results.json', JSON.stringify(rows, null, 1));
const c = (k) => rows.filter((r) => r.result === k).length;
console.log(`rows=${rows.length} works=${c('works')} broken=${c('broken')} unfinished=${c('unfinished')} skipped=${c('skipped')} untested=${c('untested')}`);
