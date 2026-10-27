// Mobile render check. Needs playwright (npm i -D playwright; npx playwright install webkit chromium)
//   BASE=http://localhost:3100 node scripts/mobile-check.mjs
//
// Proves the auth forms are in the server-rendered HTML and visible on an
// iPhone profile with JavaScript off, on slow 3G, and with JS held back.
import { chromium, webkit, devices } from 'playwright';

const BASE = (process.env.BASE || 'http://localhost:3100').replace(/\/$/, '');
const phone = devices['iPhone 13'];
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); };
const consoleProblems = [];

const pages = [
  ['/signup', '#email'],
  ['/login', '#email'],
  ['/forgot-password', '#email'],
  ['/reset-password', '#password'],
];

// 1. raw HTML (no JavaScript at all)
console.log('\n[1] curl-style fetch, JavaScript off');
for (const [p, sel] of pages) {
  const html = await (await fetch(BASE + p)).text();
  const id = sel.slice(1);
  check(`${p} HTML contains input id="${id}" and a submit button`, html.includes(`id="${id}"`) && /<button[^>]*type="submit"/.test(html));
}

// 2a. WebKit (Safari engine), iPhone profile, JavaScript blocked
console.log('\n[2a] WebKit iPhone 13, JavaScript disabled');
const wk = await webkit.launch();
{
  const ctx = await wk.newContext({ ...phone, javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const [p, sel] of pages) {
    await page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    check(`${p} form visible`, await page.locator(sel).first().isVisible());
  }
  await ctx.close();
}

// 2b. WebKit, JavaScript enabled but every script held back 15s: form must already be visible
console.log('\n[2b] WebKit iPhone 13, scripts delayed 15s (simulates weak connection)');
{
  const ctx = await wk.newContext({ ...phone });
  await ctx.route('**/_next/static/**/*.js', async (route) => { await new Promise((r) => setTimeout(r, 15000)); route.continue().catch(() => {}); });
  const page = await ctx.newPage();
  for (const [p, sel] of pages) {
    await page.goto(BASE + p, { waitUntil: 'commit' });
    const t0 = Date.now();
    await page.locator(sel).first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const ok = await page.locator(sel).first().isVisible();
    check(`${p} form visible before any script loaded`, ok, `(${Date.now() - t0}ms after commit)`);
  }
  await ctx.close();
}

// 2c. Chromium iPhone profile with real slow-3G throttling through CDP
console.log('\n[2c] Chromium iPhone 13 profile, slow 3G (400 kbps, 400 ms)');
const cr = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
{
  const ctx = await cr.newContext({ ...phone });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  for (const [p, sel] of pages) {
    const t0 = Date.now();
    await page.goto(BASE + p, { waitUntil: 'commit', timeout: 120000 });
    await page.locator(sel).first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});
    check(`${p} form visible on slow 3G`, await page.locator(sel).first().isVisible(), `(${Date.now() - t0}ms)`);
  }
  await ctx.close();
}

// 3. home page buttons on the mobile profile (WebKit + Chromium)
console.log('\n[3] Home page buttons, mobile profile');
for (const [label, browser] of [['WebKit', wk], ['Chromium', cr]]) {
  for (const [text, expectPath] of [['Open an Account', '/signup'], ['Start a Recovery Claim', '/login']]) {
    const ctx = await browser.newContext({ ...phone });
    // The local Windows image optimizer can hang on webp; images are irrelevant to the form.
    if (BASE.includes('localhost')) await ctx.route('**/_next/image**', (r) => r.abort());
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) consoleProblems.push(`${label} ${text}: ${m.text()}`); });
    page.on('pageerror', (e) => consoleProblems.push(`${label} ${text} pageerror: ${e.message}`));
    await page.goto(BASE + '/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
    let link = page.getByRole('link', { name: text }).first();
    if (!(await link.isVisible())) {
      const burger = page.locator('button[aria-label*="enu" i]').first();
      if (await burger.count()) await burger.click().catch(() => {});
      link = page.getByRole('link', { name: text }).first();
    }
    const visibleLink = await link.isVisible();
    if (visibleLink) await link.click(); else await page.goto(BASE + (text === 'Open an Account' ? '/signup' : '/claims/new'));
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const url = new URL(page.url());
    const formVisible = await page.locator('#email').first().isVisible();
    check(`${label}: "${text}" -> ${url.pathname}, form visible`, url.pathname === expectPath && formVisible, visibleLink ? '' : '(link hidden in menu on mobile; navigated directly)');
    await ctx.close();
  }
}

// 4. query-string behaviour kept
console.log('\n[4] search params still work');
{
  const ctx = await wk.newContext({ ...phone });
  if (BASE.includes('localhost')) await ctx.route('**/_next/image**', (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(BASE + '/login?error=oauth', { waitUntil: 'domcontentloaded' });
  check('/login?error=oauth shows the message in the server HTML', (await page.locator('[role=alert]').first().textContent()) === 'Something went wrong logging you in.');
  let body = null;
  await page.route('**/auth/v1/signup**', async (route) => { body = route.request().postDataJSON(); await route.fulfill({ status: 400, contentType: 'application/json', body: '{"msg":"x"}' }); });
  await page.goto(BASE + '/signup?ref=ABC123', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.fill('#fname', 'A'); await page.fill('#lname', 'B'); await page.fill('#email', 'mobile-check@example.com'); await page.fill('#password', 'Passw0rd!x');
  await page.check('input[type=checkbox]');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
  check('/signup?ref=ABC123 sends referred_by with the signup', body?.data?.referred_by === 'ABC123', JSON.stringify(body?.data ?? null));
  await ctx.close();
}

await wk.close(); await cr.close();
console.log('\nconsole/page errors during the mobile runs:', consoleProblems.length ? '\n  ' + consoleProblems.join('\n  ') : 'none');
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) && consoleProblems.length === 0 ? 0 : 1);
