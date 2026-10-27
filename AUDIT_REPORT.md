# Audit report (Phase 2) — report only, nothing was fixed

Date: 2026-10-27. Tested against a local production build of commit `485e69a` (the code that is live) using the live Supabase project. Method: `scripts/audit-check.mjs` logs in as two throwaway customers and a throwaway admin and sends real requests to every page and every API route in the build, then probes row-level security with a real customer JWT. Raw results: `audit-results.json` (228 checks: 212 works, 13 flagged, 3 skipped). Several of the 13 flagged rows are test-shape noise and are explained below, not counted as defects.

The money-adding flow (deposit page flow, `/api/transactions/deposit`, `/api/transactions/card-deposit`, `/api/admin/accounts/[id]/fund`) was skipped as instructed. Withdrawal/transfer were only sent invalid (zero) amounts.

## Findings, by priority

### P0 — Customers can edit their own balance, verification status and claim status

**Where:** database row-level security (`accounts`, `profiles`, `recovery_cases`).
**Test:** logged in as a normal customer, used the public anon key + the customer's own session (what any customer can do from their browser console) and sent:
- `update accounts set available_balance = 999999 where id = <own account>` → **succeeded**
- `update profiles set verification_status = 'verified' where id = <self>` → **succeeded**
- `update recovery_cases set status = 'recovered' where id = <own claim>` → **succeeded**

**Suspected cause:** older permissive UPDATE policies on those tables (the existing `supabase/migrations/20260929000000_customer_rls_policies.sql` only *adds* policies if missing and never drops anything, and its own header warns about exactly this). Either that migration was never applied or older broad policies still exist next to it. Server routes already do the privileged writes with the service role, so removing customer UPDATE rights should not break the app.
**What to do (needs SQL, not run by me):** in the Supabase SQL editor run `select tablename, policyname, cmd, qual, with_check from pg_policies where schemaname='public' and tablename in ('accounts','profiles','recovery_cases','transactions') order by 1,2;` and drop every `UPDATE`/`ALL` policy on `accounts` and `recovery_cases`; on `profiles` keep a self-update policy but add `revoke update (verification_status, verification_rejection_reason, deletion_requested_at) on public.profiles from authenticated;` (the app writes those through the service role). Then re-run `node scripts/audit-check.mjs` — the three `rls/write` rows must turn to "works".
**Note:** the test rows touched were my own throwaway users (`authtest+audit-*`), listed below.

### P1 — `/terms`, `/privacy` and `/disclosures` contain placeholder legal text
Files `src/app/(marketing)/terms/page.js`, `privacy/page.js`, `disclosures/page.js`: "Last updated: placeholder — replace with actual terms…", "Placeholder content." under every heading (12 occurrences). `/disclosures` is a copy of the Terms page (same component name `TermsPage`, same title "Terms of Service", identical length) instead of its own disclosures. Signup links to Terms and Privacy as agreed-to documents.

### P1 — Customers can read `system_settings`
`select * from system_settings` as a customer returns the row (anonymous gets nothing). It appears to hold the money-processing switches (the code reads `production_financial_processing` from system settings). Probably an over-broad SELECT policy; low data sensitivity, but it is an admin table.

### P2 — PWA / app icons return 404
`public/manifest.json` references `/icon-192.png` and `/icon-512.png`, and `src/app/layout.js` references `/apple-touch-icon.png`, but the files are in `public/images/`. Live: `/icon-192.png` 404, `/icon-512.png` 404, `/apple-touch-icon.png` 404, `/images/icon-192.png` 200. Causes a console error on every page and no home-screen icon.

### P2 — Several endpoints return a bare 500 instead of a validation error
(Reached by sending JSON where multipart is expected, or missing required fields.)
- `POST /api/claims/evidence`, `POST /api/onboarding`, `POST /api/verification/documents`, `POST /api/admin/partners` — empty-body 500 when the request is not valid `multipart/form-data` (uncaught `request.formData()`).
- `POST /api/admin/products` with missing fields → 500 "Could not create product." (should be 400). Also, products are created with `status: 'active'`, i.e. immediately public.
- `PATCH /api/admin/partners/[id]`, `/products/[id]`, `/testimonials/[id]` with a non-existent id → 500 instead of 404.

### P3 — Misleading success responses
- `DELETE /api/beneficiaries/[id]` returns 200 even when it deleted nothing (another user's or a non-existent id). Safe (the other user's beneficiary was not deleted) but silent.

### P3 — Known / by design
- Settings → Security shows 2FA as "Not enabled · Coming soon" (disabled on purpose per the earlier report).
- `middleware.js` is deprecated in Next 16 (renamed `proxy.js`); still works.

## What was verified working
- All 19 public pages/files, 17 customer pages, 11 admin pages + customer-detail and claim-detail dynamic pages return 200 with real content and no error markers; customer B cannot open customer A's claim (404).
- 117 unique internal links found on those pages: **no dead links**.
- New signup → profile row and one "standard" account are created automatically.
- Every API route refuses anonymous callers; every `/api/admin/*` route refuses a customer (JSON 403).
- Customer happy paths that save correctly: profile save (phone verified in DB), data export, notifications, beneficiaries create, chat conversation + message send/read, claim create, evidence upload, onboarding (with photo), verification documents (front/back/selfie) + verification submit, request-deletion (signs the user out).
- Ownership checks hold: customer B cannot cancel A's claim, close A's account, delete A's beneficiary or read A's chat (all 404/no effect).
- Admin happy paths that save correctly: claim read, status change, comments post/read, verification detail + approve (profile status updates), testimonial create/update, partner create (with logo upload)/update, product create/update, site-settings update (same values), chat read/reply, notifications.
- Withdrawal correctly refuses unverified customers (403 `VERIFICATION_REQUIRED`) and transfer rejects a zero amount (400). (That one "flagged" row is my test hitting the gate, not a defect.)
- RLS reads: customers only see their own rows on all 24 tables checked; anonymous sees nothing private; storage buckets `claim-evidence`, `verification-documents` and `partner-logos` do not list for anonymous users.

## Not tested (stated plainly)
- Clicking individual buttons/inputs in a browser on every page (only the auth screens were driven in a browser). A "button that does nothing" can only be found by HTTP/API coverage here: every API a button calls was exercised, but a button with no handler would not show up.
- The money flows and anything that moves or adds money (skipped by instruction); `PATCH /api/admin/system-settings` (financial switches) was only probed for access control.
- AI screening re-run (`rerun-ai`, calls Gemini) beyond its 404 path; Resend delivery of notification emails; large/odd file uploads; real-time chat behaviour; service-worker caching; mobile layouts.
- Admin pages' *content correctness* (numbers/labels) beyond "renders without error".

## Test data left behind (nothing deleted)
- Users: `authtest+audit-<run>-custA|custB|admin@example.com` for runs `mvq0lvu9`, `mvq0po3r`, `mvq0y52y`, `mvq14fim` (passwords randomised; temporary `admins` rows removed). Test user A's account balance is 999999 and verification is "approved" because of the P0 probes.
- Per run: 1 claim ("Audit test claim"), 1 evidence file, 3 verification documents + 1 verification session, 1 beneficiary ("Audit Ben"), chat messages, 1 testimonial ("Audit Test", unpublished), 1 partner ("Audit Partner (delete me)", unpublished), 1 financial product ("Audit Product (inactive, delete me)", set inactive straight after creation), `login_attempts` rows.
- Earlier auth-test users are listed in `AUTH_FIX_REPORT.md`.

---

## Full result list
| Result | Area | Route or file | Test | Detail |
|---|---|---|---|---|
| broken | api/probe | PATCH /api/admin/partners/[id] | admin with empty/invalid input | status 500 {"error":"Could not update partner."} |
| broken | api/probe | PATCH /api/admin/products/[id] | admin with empty/invalid input | status 500 {"error":"Could not update product."} |
| broken | api/probe | PATCH /api/admin/testimonials/[id] | admin with empty/invalid input | status 500 {"error":"Could not update testimonial."} |
| broken | api/probe | POST /api/admin/partners | admin with empty/invalid input | status 500  |
| broken | api/probe | POST /api/admin/products | admin with empty/invalid input | status 500 {"error":"Could not create product."} |
| broken | api/probe | POST /api/claims/evidence | customer with empty/invalid input | status 500  |
| broken | api/probe | POST /api/onboarding | customer with empty/invalid input | status 500  |
| broken | api/probe | POST /api/verification/documents | customer with empty/invalid input | status 500  |
| broken | api/customer | POST /api/transactions/withdrawal | rejects zero amount (valid payloads not sent) | 403 {"error":"Verification required before withdrawals are available.","code":"VERIFICATION_REQUIRED"} |
| broken | rls/select | system_settings | read as customer + anonymous | customer sees 1 rows; anon sees 0; customer can read admin-only table |
| broken | rls/write | profiles.verification_status | customer must NOT be able to write | write succeeded |
| broken | rls/write | accounts.available_balance | customer must NOT be able to write | write succeeded |
| broken | rls/write | recovery_cases.status | customer must NOT be able to write | write succeeded |
| skipped | api/access | POST /api/admin/accounts/[id]/fund | all | money-adding flow excluded by instruction |
| skipped | api/access | POST /api/transactions/card-deposit | all | money-adding flow excluded by instruction |
| skipped | api/access | POST /api/transactions/deposit | all | money-adding flow excluded by instruction |
| works | data | new user -> accounts | accounts auto-created for a new signup | rows=1 standard |
| works | page/public | / | GET page | 200 title="ClaimPoint Solutions — Recovery and Banking, One Platform" visibleChars=5712 |
| works | page/public | /about | GET page | 200 title="About — ClaimPoint Solutions" visibleChars=1541 |
| works | page/public | /banking | GET page | 200 title="Banking — ClaimPoint Solutions" visibleChars=1400 |
| works | page/public | /contact | GET page | 200 title="Contact — ClaimPoint Solutions" visibleChars=965 |
| works | page/public | /disclosures | GET page | 200 title="Terms of Service — ClaimPoint Solutions" visibleChars=1080 |
| works | page/public | /help | GET page | 200 title="Help Center — ClaimPoint Solutions" visibleChars=1485 |
| works | page/public | /how-it-works | GET page | 200 title="ClaimPoint Solutions — Recovery and Banking, One Platform" visibleChars=3588 |
| works | page/public | /privacy | GET page | 200 title="Privacy Policy — ClaimPoint Solutions" visibleChars=991 |
| works | page/public | /recovery | GET page | 200 title="Recovery &amp; Claims — ClaimPoint Solutions" visibleChars=1504 |
| works | page/public | /security | GET page | 200 title="Security — ClaimPoint Solutions" visibleChars=1431 |
| works | page/public | /terms | GET page | 200 title="Terms of Service — ClaimPoint Solutions" visibleChars=1080 |
| works | page/public | /login | GET page | 200 title="Log In — ClaimPoint Solutions" visibleChars=532 |
| works | page/public | /signup | GET page | 200 title="Create Account — ClaimPoint Solutions" visibleChars=258 |
| works | page/public | /forgot-password | GET page | 200 title="Reset Password — ClaimPoint Solutions" visibleChars=223 |
| works | page/public | /reset-password | GET page | 200 title="Set New Password — ClaimPoint Solutions" visibleChars=197 |
| works | page/public | /robots.txt | GET page | 200 title="" visibleChars=354 |
| works | page/public | /sitemap.xml | GET page | 200 title="" visibleChars=966 |
| works | page/public | /manifest.json | GET page | 200 title="" visibleChars=623 |
| works | page/public | /sw.js | GET page | 200 title="" visibleChars=1132 |
| works | page/customer | /dashboard | GET page | 200 title="Dashboard — ClaimPoint Solutions" visibleChars=1124 |
| works | page/customer | /accounts | GET page | 200 title="Accounts — ClaimPoint Solutions" visibleChars=692 |
| works | page/customer | /activity | GET page | 200 title="Activity — ClaimPoint Solutions" visibleChars=727 |
| works | page/customer | /beneficiaries | GET page | 200 title="Beneficiaries — ClaimPoint Solutions" visibleChars=724 |
| works | page/customer | /claims | GET page | 200 title="My Claims — ClaimPoint Solutions" visibleChars=739 |
| works | page/customer | /claims/new | GET page | 200 title="Start a Claim — ClaimPoint Solutions" visibleChars=576 |
| works | page/customer | /deposits | GET page | 200 title="Deposit — ClaimPoint Solutions" visibleChars=669 |
| works | page/customer | /documents | GET page | 200 title="Documents — ClaimPoint Solutions" visibleChars=749 |
| works | page/customer | /notifications | GET page | 200 title="Notifications — ClaimPoint Solutions" visibleChars=717 |
| works | page/customer | /referrals | GET page | 200 title="Referrals — ClaimPoint Solutions" visibleChars=793 |
| works | page/customer | /savings | GET page | 200 title="Savings &amp; CDs — ClaimPoint Solutions" visibleChars=925 |
| works | page/customer | /settings | GET page | 200 title="Settings — ClaimPoint Solutions" visibleChars=783 |
| works | page/customer | /support | GET page | 200 title="Support — ClaimPoint Solutions" visibleChars=1145 |
| works | page/customer | /transfers | GET page | 200 title="Transfer — ClaimPoint Solutions" visibleChars=762 |
| works | page/customer | /withdrawals | GET page | 200 title="Withdraw — ClaimPoint Solutions" visibleChars=663 |
| works | page/customer | /onboarding | GET page | 200 title="Set Up Your Profile — ClaimPoint Solutions" visibleChars=253 |
| works | page/customer | /verify | GET page | 200 title="Verify Your Identity — ClaimPoint Solutions" visibleChars=340 |
| works | page/admin | /cp-adm-7f92mk3x/dashboard | GET page | 200 title="Admin Dashboard — ClaimPoint Solutions" visibleChars=694 |
| works | page/admin | /cp-adm-7f92mk3x/audit-log | GET page | 200 title="Audit Log — Admin — ClaimPoint Solutions" visibleChars=2821 |
| works | page/admin | /cp-adm-7f92mk3x/business-settings | GET page | 200 title="Business Settings — Admin — ClaimPoint Solutions" visibleChars=658 |
| works | page/admin | /cp-adm-7f92mk3x/chat | GET page | 200 title="Live Chat — Admin — ClaimPoint Solutions" visibleChars=419 |
| works | page/admin | /cp-adm-7f92mk3x/claims | GET page | 200 title="Claims &amp; Recovery — Admin — ClaimPoint Solutions" visibleChars=663 |
| works | page/admin | /cp-adm-7f92mk3x/customers | GET page | 200 title="Customers — Admin — ClaimPoint Solutions" visibleChars=3121 |
| works | page/admin | /cp-adm-7f92mk3x/financial-config | GET page | 200 title="Financial Configuration — Admin — ClaimPoint Solutions" visibleChars=620 |
| works | page/admin | /cp-adm-7f92mk3x/partners | GET page | 200 title="Partners — Admin — ClaimPoint Solutions" visibleChars=786 |
| works | page/admin | /cp-adm-7f92mk3x/products | GET page | 200 title="Products — Admin — ClaimPoint Solutions" visibleChars=632 |
| works | page/admin | /cp-adm-7f92mk3x/testimonials | GET page | 200 title="Testimonials — Admin — ClaimPoint Solutions" visibleChars=2448 |
| works | page/admin | /cp-adm-7f92mk3x/verification | GET page | 200 title="Verification Queue — Admin — ClaimPoint Solutions" visibleChars=622 |
| works | api | POST /api/claims | create claim as customer | 201 {"claim":{"id":"bf494a82-bc1c-4740-ba6f-2dd8d632de1d","user_id":"be58240e-60a6-4800-a1ff-dc1aba05052f","reference":"CP-71549","category" |
| works | page/customer | /claims/bf494a82-bc1c-4740-ba6f-2dd8d632de1d | GET page | 200 title="Claim Detail — ClaimPoint Solutions" visibleChars=1039 |
| works | security | /claims/bf494a82-bc1c-4740-ba6f-2dd8d632de1d | customer B opens customer A's claim page | 404 |
| works | page/admin | /cp-adm-7f92mk3x/customers/be58240e-60a6-4800-a1ff-dc1aba05052f | GET page | 200 title="Customer Detail — Admin — ClaimPoint Solutions" visibleChars=661 |
| works | link | 120 unique internal links | crawl of links found on swept pages |  |
| works | api/access | DELETE /api/admin/partners/[id] | anonymous is refused | status 401 |
| works | api/access | DELETE /api/admin/partners/[id] | customer is refused | status 403 |
| works | api/probe | DELETE /api/admin/partners/[id] | admin with empty/invalid input | status 200 {"success":true} |
| works | api/access | DELETE /api/admin/testimonials/[id] | anonymous is refused | status 401 |
| works | api/access | DELETE /api/admin/testimonials/[id] | customer is refused | status 403 |
| works | api/probe | DELETE /api/admin/testimonials/[id] | admin with empty/invalid input | status 200 {"success":true} |
| works | api/access | DELETE /api/beneficiaries/[id] | anonymous is refused | status 401 |
| works | api/probe | DELETE /api/beneficiaries/[id] | customer with empty/invalid input | status 200 {"success":true} |
| works | api/access | DELETE /api/claims/evidence | anonymous is refused | status 401 |
| works | api/probe | DELETE /api/claims/evidence | customer with empty/invalid input | status 200 {"deleted":0} |
| works | api/access | DELETE /api/verification/documents | anonymous is refused | status 401 |
| works | api/probe | DELETE /api/verification/documents | customer with empty/invalid input | status 200 {"deleted":0} |
| works | api/access | GET /api/admin/chat/conversation-messages | anonymous is refused | status 401 |
| works | api/access | GET /api/admin/chat/conversation-messages | customer is refused | status 403 |
| works | api/probe | GET /api/admin/chat/conversation-messages | admin with empty/invalid input | status 400 {"error":"Missing conversationId"} |
| works | api/access | GET /api/admin/claims/[id] | anonymous is refused | status 401 |
| works | api/access | GET /api/admin/claims/[id] | customer is refused | status 403 |
| works | api/probe | GET /api/admin/claims/[id] | admin with empty/invalid input | status 404 {"error":"Cannot coerce the result to a single JSON object"} |
| works | api/access | GET /api/admin/claims/[id]/comments | anonymous is refused | status 401 |
| works | api/access | GET /api/admin/claims/[id]/comments | customer is refused | status 403 |
| works | api/probe | GET /api/admin/claims/[id]/comments | admin with empty/invalid input | status 200 {"comments":[]} |
| works | api/access | GET /api/admin/notifications | anonymous is refused | status 401 |
| works | api/access | GET /api/admin/notifications | customer is refused | status 403 |
| works | api/probe | GET /api/admin/notifications | admin with empty/invalid input | status 200 {"notifications":[]} |
| works | api/access | GET /api/admin/verification/[id]/detail | anonymous is refused | status 401 |
| works | api/access | GET /api/admin/verification/[id]/detail | customer is refused | status 403 |
| works | api/probe | GET /api/admin/verification/[id]/detail | admin with empty/invalid input | status 404 {"error":"Cannot coerce the result to a single JSON object"} |
| works | api/access | GET /api/chat/conversations | anonymous is refused | status 401 |
| works | api/probe | GET /api/chat/conversations | customer with empty/invalid input | status 201 {"conversation":{"id":"ae1fdd51-1644-4db3-bcd3-685ca1b2998f","user_id":"be58240e-60a6-4800-a1ff-dc1a |
| works | api/access | GET /api/chat/messages | anonymous is refused | status 401 |
| works | api/probe | GET /api/chat/messages | customer with empty/invalid input | status 400 {"error":"Missing conversationId"} |
| works | api/access | GET /api/notifications | anonymous is refused | status 401 |
| works | api/probe | GET /api/notifications | customer with empty/invalid input | status 200 {"notifications":[]} |
| works | api/access | GET /api/settings/export-data | anonymous is refused | status 401 |
| works | api/probe | GET /api/settings/export-data | customer with empty/invalid input | status 200 { "exportedAt": "2026-10-27T01:53:43.946Z", "profile": { "id": "be58240e-60a6-4800-a1ff-dc1a |
| works | api/access | GET /api/verification/documents/signed-url | anonymous is refused | status 401 |
| works | api/probe | GET /api/verification/documents/signed-url | customer with empty/invalid input | status 400 {"error":"Missing documentId"} |
| works | api/access | PATCH /api/admin/claims/[id]/status | anonymous is refused | status 401 |
| works | api/access | PATCH /api/admin/claims/[id]/status | customer is refused | status 403 |
| works | api/probe | PATCH /api/admin/claims/[id]/status | admin with empty/invalid input | status 400 {"error":"Missing status"} |
| works | api/access | PATCH /api/admin/notifications/[id]/read | anonymous is refused | status 401 |
| works | api/access | PATCH /api/admin/notifications/[id]/read | customer is refused | status 403 |
| works | api/probe | PATCH /api/admin/notifications/[id]/read | admin with empty/invalid input | status 200 {"success":true} |
| works | api/access | PATCH /api/admin/partners/[id] | anonymous is refused | status 401 |
| works | api/access | PATCH /api/admin/partners/[id] | customer is refused | status 403 |
| works | api/access | PATCH /api/admin/products/[id] | anonymous is refused | status 401 |
| works | api/access | PATCH /api/admin/products/[id] | customer is refused | status 403 |
| works | api/access | PATCH /api/admin/site-settings | anonymous is refused | status 401 |
| works | api/access | PATCH /api/admin/site-settings | customer is refused | status 403 |
| works | api/probe | PATCH /api/admin/site-settings | admin with empty/invalid input | status 200 {"settings":{"id":1,"company_name":"ClaimPoint Solutions","support_email":"claimpoint.services@gmail |
| works | api/access | PATCH /api/admin/system-settings | anonymous is refused | status 401 |
| works | api/access | PATCH /api/admin/system-settings | customer is refused | status 403 |
| works | api/probe | PATCH /api/admin/system-settings | admin with empty/invalid input | status 200 {"settings":{"id":1,"production_financial_processing":false,"deposits_enabled":true,"withdrawals_ena |
| works | api/access | PATCH /api/admin/testimonials/[id] | anonymous is refused | status 401 |
| works | api/access | PATCH /api/admin/testimonials/[id] | customer is refused | status 403 |
| works | api/access | PATCH /api/admin/verification/[id] | anonymous is refused | status 401 |
| works | api/access | PATCH /api/admin/verification/[id] | customer is refused | status 403 |
| works | api/probe | PATCH /api/admin/verification/[id] | admin with empty/invalid input | status 404 {"error":"Verification session not found"} |
| works | api/access | PATCH /api/notifications/[id]/read | anonymous is refused | status 401 |
| works | api/probe | PATCH /api/notifications/[id]/read | customer with empty/invalid input | status 200 {"success":true} |
| works | api/access | PATCH /api/settings/profile | anonymous is refused | status 401 |
| works | api/probe | PATCH /api/settings/profile | customer with empty/invalid input | status 400 {"error":"No fields to update."} |
| works | api/access | POST /api/accounts/[id]/close | anonymous is refused | status 401 |
| works | api/probe | POST /api/accounts/[id]/close | customer with empty/invalid input | status 404 {"error":"Account not found."} |
| works | api/access | POST /api/admin/chat/messages | anonymous is refused | status 401 |
| works | api/access | POST /api/admin/chat/messages | customer is refused | status 403 |
| works | api/probe | POST /api/admin/chat/messages | admin with empty/invalid input | status 400 {"error":"Missing conversation or message."} |
| works | api/access | POST /api/admin/claims/[id]/comments | anonymous is refused | status 401 |
| works | api/access | POST /api/admin/claims/[id]/comments | customer is refused | status 403 |
| works | api/probe | POST /api/admin/claims/[id]/comments | admin with empty/invalid input | status 400 {"error":"Message is required."} |
| works | api/access | POST /api/admin/partners | anonymous is refused | status 401 |
| works | api/access | POST /api/admin/partners | customer is refused | status 403 |
| works | api/access | POST /api/admin/products | anonymous is refused | status 401 |
| works | api/access | POST /api/admin/products | customer is refused | status 403 |
| works | api/access | POST /api/admin/testimonials | anonymous is refused | status 401 |
| works | api/access | POST /api/admin/testimonials | customer is refused | status 403 |
| works | api/probe | POST /api/admin/testimonials | admin with empty/invalid input | status 400 {"error":"Customer name and quote are required."} |
| works | api/access | POST /api/admin/verification/[id]/rerun-ai | anonymous is refused | status 401 |
| works | api/access | POST /api/admin/verification/[id]/rerun-ai | customer is refused | status 403 |
| works | api/probe | POST /api/admin/verification/[id]/rerun-ai | admin with empty/invalid input | status 404 {"error":"No front-of-ID document found for this session."} |
| works | api/access | POST /api/beneficiaries | anonymous is refused | status 401 |
| works | api/probe | POST /api/beneficiaries | customer with empty/invalid input | status 400 {"error":"Nickname is required."} |
| works | api/access | POST /api/chat/messages | anonymous is refused | status 401 |
| works | api/probe | POST /api/chat/messages | customer with empty/invalid input | status 400 {"error":"Missing conversation or message."} |
| works | api/access | POST /api/claims | anonymous is refused | status 401 |
| works | api/probe | POST /api/claims | customer with empty/invalid input | status 400 {"error":"Missing required claim fields"} |
| works | api/access | POST /api/claims/[id]/cancel | anonymous is refused | status 401 |
| works | api/probe | POST /api/claims/[id]/cancel | customer with empty/invalid input | status 404 {"error":"Claim not found."} |
| works | api/access | POST /api/claims/evidence | anonymous is refused | status 401 |
| works | api/access | POST /api/onboarding | anonymous is refused | status 401 |
| works | api/access | POST /api/products/open | anonymous is refused | status 401 |
| works | api/probe | POST /api/products/open | customer with empty/invalid input | status 400 {"error":"Missing product or amount."} |
| works | api/access | POST /api/settings/password | anonymous is refused | status 401 |
| works | api/probe | POST /api/settings/password | customer with empty/invalid input | status 400 {"error":"Both current and new password are required."} |
| works | api/access | POST /api/transactions/transfer | anonymous is refused | status 401 |
| works | api/probe | POST /api/transactions/transfer | customer with empty/invalid input | status 400 {"error":"Enter a valid transfer amount."} |
| works | api/access | POST /api/transactions/withdrawal | anonymous is refused | status 401 |
| works | api/probe | POST /api/transactions/withdrawal | customer with empty/invalid input | status 403 {"error":"Verification required before withdrawals are available.","code":"VERIFICATION_REQUIRED"} |
| works | api/access | POST /api/verification | anonymous is refused | status 401 |
| works | api/probe | POST /api/verification | customer with empty/invalid input | status 400 {"error":"Missing required verification fields"} |
| works | api/access | POST /api/verification/documents | anonymous is refused | status 401 |
| works | api/customer | PATCH /api/settings/profile | happy path | 200 saved phone=+15550001111 street=null {"profile":{"id":"be58240e-60a6-4800-a1ff-dc1aba05052f","first_name":"Audit","last_name":"CustA","p |
| works | api/customer | GET /api/settings/export-data | happy path | 200 bytes=1699 |
| works | api/customer | GET /api/notifications | happy path | 200 {"notifications":[]} |
| works | api/customer | POST /api/beneficiaries | happy path | 201 rows=1 {"beneficiary":{"id":"74f66413-809a-47d3-9bbd-4276c4772fcc","user_id":"be58240e-60a6-4800-a1ff-dc1aba05052f","nickname": |
| works | security | DELETE /api/beneficiaries/[id] (customer B on A) | happy path | status 200; beneficiary still exists=true |
| works | security | GET /api/chat/messages | customer B reads customer A's conversation | status 404 |
| works | api/customer | GET /api/chat/conversations + POST /api/chat/messages | happy path | post 201, get 200 |
| works | api/customer | POST /api/claims/evidence | happy path | 201 {"evidence":{"id":"7cc343fe-5f2d-4249-b068-fa5c4bd0dd42","claim_id":null,"user_id":"be58240e-60a6-4800-a1ff-dc1aba05052f","storage_path" |
| works | api/customer | POST /api/claims/[id]/cancel (customer B on A) | happy path | status 404; claim status=submitted |
| works | api/customer | POST /api/onboarding | happy path | 200 {"success":true} |
| works | api/customer | POST /api/verification/documents (front/back/selfie) | happy path | front:201 back:201 selfie:201 |
| works | api/customer | POST /api/verification (submit) | happy path | 201 sessions=1 {"session":{"id":"22c3f632-ce23-409b-8681-c0f95360ac08","user_id":"be58240e-60a6-4800-a1ff-dc1aba05052f","id_type":"driv |
| works | security | POST /api/accounts/[id]/close (customer B on A) | happy path | status 404; account status=active |
| works | api/customer | POST /api/transactions/transfer | rejects zero amount (valid payloads not sent) | 400 {"error":"Enter a valid transfer amount."} |
| works | api/admin | GET /api/admin/notifications | happy path | 200 |
| works | api/admin | GET /api/admin/claims/[id] | happy path | 200 {"claim":{"id":"bf494a82-bc1c-4740-ba6f-2dd8d632de1d","user_id":"be58240e-60a6-4800-a1ff-dc1aba05052 |
| works | api/admin | PATCH /api/admin/claims/[id]/status | happy path | 200 now=under_review {"claim":{"id":"bf494a82-bc1c-4740-ba6f-2dd8d632de1d","user_id":"be58240e-60a6-4800-a1ff-dc1aba05052 |
| works | api/admin | POST+GET /api/admin/claims/[id]/comments | happy path | post 201 get 200 |
| works | api/admin | GET /api/admin/verification/[id]/detail | happy path | 200 bytes=3211 |
| works | api/admin | PATCH /api/admin/verification/[id] (approve) | happy path | 200 profile now=approved {"success":true} |
| works | api/admin | POST/PATCH /api/admin/testimonials | happy path | post 201 patch 200 id=d9e14457-f582-40e3-89be-06ecc6b5cf13 {"testimonial":{"id":"d9e14457-f582-40e3-89be-06ecc6b5cf13","customer_name":"Audi |
| works | api/admin | POST/PATCH /api/admin/partners | happy path | post 201 patch 200 id=b29351a7-c96e-42d7-a455-4aefc9230170 {"partner":{"id":"b29351a7-c96e-42d7-a455-4aefc9230170","name":"Audit Partner (de |
| works | api/admin | POST/PATCH /api/admin/products | happy path | post 201 patch 200 id=c8c59fb7-aa5a-494d-a234-6b1ad1614723 {"product":{"id":"c8c59fb7-aa5a-494d-a234-6b1ad1614723","product_type":"savings", |
| works | api/admin | PATCH /api/admin/site-settings (same values) | happy path | 200 unchanged=true {"settings":{"id":1,"company_name":"ClaimPoint Solutions","support_email":"claimpoint.services@gmail |
| works | api/admin | GET /api/admin/chat/conversation-messages + POST /api/admin/chat/messages | happy path | get 200 post 201 |
| works | api/customer | POST /api/settings/request-deletion | happy path | 200; session afterwards: dashboard -> 307 |
| works | rls/select | profiles | read as customer + anonymous | customer sees 1 rows; anon sees 0 |
| works | rls/select | accounts | read as customer + anonymous | customer sees 1 rows; anon sees 0 |
| works | rls/select | transactions | read as customer + anonymous | customer sees 0 rows; anon sees 0 |
| works | rls/select | beneficiaries | read as customer + anonymous | customer sees 1 rows; anon sees 0 |
| works | rls/select | recovery_cases | read as customer + anonymous | customer sees 1 rows; anon sees 0 |
| works | rls/select | claim_evidence | read as customer + anonymous | customer sees 1 rows; anon sees 0 |
| works | rls/select | claim_comments | read as customer + anonymous | customer sees 1 rows; anon sees 0 |
| works | rls/select | verification_sessions | read as customer + anonymous | customer sees 1 rows; anon sees 0 |
| works | rls/select | verification_documents | read as customer + anonymous | customer sees 3 rows; anon sees 0 |
| works | rls/select | notifications | read as customer + anonymous | customer sees 3 rows; anon sees 0 |
| works | rls/select | chat_conversations | read as customer + anonymous | customer sees 1 rows; anon sees 0 |
| works | rls/select | chat_messages | read as customer + anonymous | customer sees 2 rows; anon sees 0 |
| works | rls/select | referrals | read as customer + anonymous | customer sees 0 rows; anon sees 0 |
| works | rls/select | financial_products | read as customer + anonymous | customer sees 3 rows; anon sees 3 |
| works | rls/select | partners | read as customer + anonymous | customer sees 8 rows; anon sees 5 |
| works | rls/select | testimonials | read as customer + anonymous | customer sees 5 rows; anon sees 5 |
| works | rls/select | site_settings | read as customer + anonymous | customer sees 1 rows; anon sees 1 |
| works | rls/select | admins | read as customer + anonymous | customer sees 0 rows; anon sees 0 |
| works | rls/select | admin_notifications | read as customer + anonymous | customer sees ERR rows (Could not find the table 'public.admin_notifications' in the schema cache); anon sees ERR (Could not find the table  |
| works | rls/select | audit_log | read as customer + anonymous | customer sees 0 rows; anon sees 0 |
| works | rls/select | verification_internal_review | read as customer + anonymous | customer sees 0 rows; anon sees 0 |
| works | rls/select | claim_internal_review | read as customer + anonymous | customer sees 0 rows; anon sees 0 |
| works | rls/select | login_attempts | read as customer + anonymous | customer sees 0 rows; anon sees 0 |
| works | rls/write | profiles.first_name (own) | customer may write own row | write succeeded |
| works | rls/write | admins insert | customer must NOT be able to write | new row violates row-level security policy for table "admins" |
| works | rls/write | login_attempts insert | customer must NOT be able to write | new row violates row-level security policy for table "login_attempts" |
| works | rls/write | site_settings.company_name | customer must NOT be able to write | invalid input syntax for type integer: "00000000-0000-0000-0000-000000000000" |
| works | rls/write | transactions insert (arbitrary completed) | customer must NOT be able to write | null value in column "reference" of relation "transactions" violates not-null constraint |
| works | rls/write | notifications (other user) | customer must NOT be able to write | Could not find the 'is_read' column of 'notifications' in the schema cache |
| works | rls/storage | claim-evidence | anonymous bucket listing | 0 objects visible |
| works | rls/storage | verification-documents | anonymous bucket listing | 0 objects visible |
| works | rls/storage | partner-logos | anonymous bucket listing | 3 objects visible |
