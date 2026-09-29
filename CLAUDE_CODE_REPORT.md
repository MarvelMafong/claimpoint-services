ClaimPoint Solutions — audit and fix report (2026-09-29)
=========================================================

A root cause that runs through several of these bugs
----------------------------------------------------
A lot of routes wrote data through the customer's own RLS-scoped Supabase
client. When RLS blocks an UPDATE, Supabase does not return an error. It
just changes zero rows, so the code carried on as if the write had worked.
That one pattern explains the missing verification documents, the missing
claim evidence, account closing that didn't close, and claim cancel. The
fix: each route checks ownership with the customer's client, then does the
write through the service-role client, limited to that user's rows. The
other way around is also a risk: if older policies let customers UPDATE
these rows, anyone could have edited balances or statuses directly through
the public REST API.

Known issues
------------
1. Admins couldn't see claim evidence images
   - AdminEvidenceAndComments.jsx was never imported anywhere, and there is
     no admin claim detail page. Claims are reviewed in ClaimsWorkspace,
     which only showed file names.
   - lib/data/admin.js getClaimDetail now creates 5-minute signed URLs for
     the private claim-evidence bucket using the service role. It also
     returns the claim's comments.
   - ClaimsWorkspace now shows AdminEvidenceAndComments (image thumbnails
     plus the admin-to-customer update thread). The first claim's details
     now load automatically. After a status save, the list badge updates.
   - Evidence linking on claim submit (api/claims) now uses the service
     client, so new claims actually get their files attached.
   - Older claims whose files were never linked: the admin view falls back
     to that customer's unlinked uploads made before the claim was filed,
     marked "Not linked to this claim".

2. Verification showed "No documents found"
   - Admin reads already used the service role, so RLS on
     verification_documents was not the actual cause. The cause was the
     customer-side update that links documents to a session: RLS blocked it
     silently, so documents stayed at session_id = null.
   - Linking now uses the service client (own rows, unlinked only).
   - The admin detail view falls back to the customer's unlinked documents
     for sessions that were already affected.
   - The migration file has an optional backfill query, commented out.

3. Beneficiaries not selectable in Withdraw/Transfer
   - withdrawals/page.js and transfers/page.js now fetch beneficiaries and
     pass them to MoneyForm. MoneyForm already supported them. Deposits
     don't use beneficiaries.

4. 2FA toggle
   - It used to let customers "enable" SMS 2FA and then showed "Enabled",
     even though nothing was protecting the account. The toggle is now
     disabled, labelled "Coming soon", and has a clear "Not yet available —
     your account is protected by your password only" notice.

5. Closing a Savings/CD account into Standard
   - It was broken. The close route wrote balances through the customer
     client, which either silently did nothing or relied on customers being
     able to write balances. It also only recognised 'standard_account',
     while other code uses 'standard'.
   - Rewritten: ownership check, then service-client writes; a guard so a
     double-click can't move the balance twice; a rollback if crediting
     Standard fails; "already closed" is rejected.
   - Added STANDARD_ACCOUNT_TYPES / isStandardAccount in lib/data/accounts.js
     so both spellings count as Standard everywhere (close route, savings
     page, dashboard grid, getPrimaryAccount).
   - Related bug found and fixed: opening a Savings/CD (api/products/open)
     credited the new product but never took the money out of the funding
     account. Combined with closing, that let customers create money. Now a
     funding account is required. The new account is created and the
     funding account debited through the service client, with a
     balance-guarded update, a rollback, and a transaction record. The
     savings page also used the wrong type string, so the funding dropdown
     was empty; that's fixed too.

6. Claim cancel and draft resume
   - Cancelling a submitted claim (api/claims/[id]/cancel) updated
     recovery_cases through the customer client, so it silently did nothing
     unless customers had general UPDATE rights (which would itself be a
     security hole). It now checks ownership, then uses the service client
     with a status guard.
   - Both draft flows (Claims and Verification): the autosave effect could
     overwrite a saved draft with the empty starting state before it was
     restored. Added a "hydrated" guard.
   - Claims drafts were stored under one browser-wide key, so another user
     on the same browser would see them. They are now stored per user; the
     old key is cleared.
   - Cancelling a draft now really deletes the uploaded files. The
     Verification confirm dialog already promised this but didn't do it.
     Added DELETE handlers on /api/claims/evidence and
     /api/verification/documents. They only remove the caller's own
     unlinked uploads (storage object and row).

Other things found in the wider scan
------------------------------------
- api/verification: profiles.verification_status is now written through
  the service client, so customers never need UPDATE rights on it. The
  AI-screening download also uses the service client.
- DataAndPrivacy (data export and deletion request) existed but was never
  shown anywhere. It's now a "Data & privacy" tab in Settings.
- All sidebar, tab-bar and in-page links point to routes that exist. No
  dead routes found.
- New migration file (NOT run against the database):
  supabase/migrations/20260929000000_customer_rls_policies.sql
  It is idempotent and additive. It enables RLS and adds owner-only
  policies for every table and storage bucket the customer client touches.
  It deliberately does NOT give customers UPDATE on recovery_cases, or
  INSERT/UPDATE on accounts.

Couldn't fix / needs you
------------------------
- Apply the migration yourself after reviewing it (Supabase SQL editor).
- Check the existing policies on `accounts` and `profiles` in the Supabase
  dashboard. If one lets customers UPDATE their own row without column
  limits, they can change available_balance or verification_status
  directly. I couldn't see the live policies: every supabase-*.sql file in
  the repo is empty (0 bytes), so I didn't write DROP statements blind.
- CardDepositForm is still left unused on purpose. It asks customers for
  real card numbers and CVV with no PCI-compliant processor behind it.
  Connect Stripe (or similar) before exposing it.
- getAllCustomersWithStats in lib/data/customer-detail.js is unused. It's
  harmless, so I left it.
- `npm run lint` crashes because eslint-config-next needs `typescript`, and
  it isn't installed. Fix: `npm i -D typescript`. I didn't change
  dependencies.
- Next 16 deprecation warnings: middleware.js should become proxy.js, and
  the Edge runtime is deprecated. These are not errors; I left them to
  avoid risky auth changes without testing.
- None of this was tested against a live database or in a browser. It was
  verified by reading the code and by `npm run build` only.
