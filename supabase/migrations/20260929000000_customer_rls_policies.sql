-- ClaimPoint — customer RLS policy audit (2026-09-29)
--
-- NOT APPLIED AUTOMATICALLY. Review, then run in the Supabase SQL editor
-- (or `supabase db push`). Every statement is idempotent and additive:
-- it enables RLS where missing and creates a policy only if a policy with
-- the same name does not already exist. Nothing is dropped.
--
-- Scope: every table / bucket that the app writes to or reads from with
-- the customer's own (anon-key, cookie session) Supabase client. Admin
-- screens and privileged writes (balances, verification_status, evidence
-- linking, claim cancellation) now use the service-role client in code and
-- deliberately get NO customer policy here.
--
-- Intentionally NOT granted to customers:
--   * UPDATE on recovery_cases        (customers must not set their own status)
--   * INSERT/UPDATE on accounts       (customers must not write balances)
--   * UPDATE on verification_sessions / verification_documents / claim_evidence
--   * anything on admin_*, audit_log, *_internal_review, login_attempts
--
-- Please also review existing policies on `accounts` and `profiles`: if an
-- older policy lets customers UPDATE any column of their own row, they can
-- change available_balance / verification_status directly through the
-- public REST API. See CLAUDE_CODE_REPORT.md.

create or replace function pg_temp.ensure_policy(
  p_table text, p_name text, p_sql text
) returns void language plpgsql as $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = split_part(p_table, '.', 1)
      and tablename  = split_part(p_table, '.', 2)
      and policyname = p_name
  ) then
    execute p_sql;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.accounts              enable row level security;
alter table public.transactions          enable row level security;
alter table public.beneficiaries         enable row level security;
alter table public.recovery_cases        enable row level security;
alter table public.claim_evidence        enable row level security;
alter table public.claim_comments        enable row level security;
alter table public.verification_sessions enable row level security;
alter table public.verification_documents enable row level security;
alter table public.notifications         enable row level security;
alter table public.chat_conversations    enable row level security;
alter table public.chat_messages         enable row level security;

-- ---------------------------------------------------------------------------
-- profiles (onboarding, settings, deletion request update own row)
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.profiles', 'profiles_select_own',
  $p$create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid())$p$);
select pg_temp.ensure_policy('public.profiles', 'profiles_update_own',
  $p$create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid())$p$);

-- ---------------------------------------------------------------------------
-- accounts — read only for customers
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.accounts', 'accounts_select_own',
  $p$create policy accounts_select_own on public.accounts for select to authenticated using (user_id = auth.uid())$p$);

-- ---------------------------------------------------------------------------
-- transactions — customers create pending requests, read their own
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.transactions', 'transactions_select_own',
  $p$create policy transactions_select_own on public.transactions for select to authenticated using (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.transactions', 'transactions_insert_own_pending',
  $p$create policy transactions_insert_own_pending on public.transactions for insert to authenticated
     with check (user_id = auth.uid() and status in ('pending', 'processing')
       and account_id in (select id from public.accounts where user_id = auth.uid()))$p$);

-- ---------------------------------------------------------------------------
-- beneficiaries
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.beneficiaries', 'beneficiaries_select_own',
  $p$create policy beneficiaries_select_own on public.beneficiaries for select to authenticated using (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.beneficiaries', 'beneficiaries_insert_own',
  $p$create policy beneficiaries_insert_own on public.beneficiaries for insert to authenticated with check (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.beneficiaries', 'beneficiaries_delete_own',
  $p$create policy beneficiaries_delete_own on public.beneficiaries for delete to authenticated using (user_id = auth.uid())$p$);

-- ---------------------------------------------------------------------------
-- recovery_cases (claims) — insert + read own, no customer UPDATE
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.recovery_cases', 'recovery_cases_select_own',
  $p$create policy recovery_cases_select_own on public.recovery_cases for select to authenticated using (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.recovery_cases', 'recovery_cases_insert_own',
  $p$create policy recovery_cases_insert_own on public.recovery_cases for insert to authenticated
     with check (user_id = auth.uid() and status = 'submitted')$p$);

-- ---------------------------------------------------------------------------
-- claim_evidence — insert unlinked drafts + read own
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.claim_evidence', 'claim_evidence_select_own',
  $p$create policy claim_evidence_select_own on public.claim_evidence for select to authenticated using (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.claim_evidence', 'claim_evidence_insert_own',
  $p$create policy claim_evidence_insert_own on public.claim_evidence for insert to authenticated
     with check (user_id = auth.uid() and claim_id is null)$p$);

-- ---------------------------------------------------------------------------
-- claim_comments — customers read admin updates on their own claims
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.claim_comments', 'claim_comments_select_own_claim',
  $p$create policy claim_comments_select_own_claim on public.claim_comments for select to authenticated
     using (claim_id in (select id from public.recovery_cases where user_id = auth.uid()))$p$);

-- ---------------------------------------------------------------------------
-- verification_sessions / verification_documents
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.verification_sessions', 'verification_sessions_select_own',
  $p$create policy verification_sessions_select_own on public.verification_sessions for select to authenticated using (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.verification_sessions', 'verification_sessions_insert_own',
  $p$create policy verification_sessions_insert_own on public.verification_sessions for insert to authenticated
     with check (user_id = auth.uid() and status = 'submitted')$p$);

select pg_temp.ensure_policy('public.verification_documents', 'verification_documents_select_own',
  $p$create policy verification_documents_select_own on public.verification_documents for select to authenticated using (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.verification_documents', 'verification_documents_insert_own',
  $p$create policy verification_documents_insert_own on public.verification_documents for insert to authenticated
     with check (user_id = auth.uid() and session_id is null)$p$);

-- ---------------------------------------------------------------------------
-- notifications — read own, mark own as read
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.notifications', 'notifications_select_own',
  $p$create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.notifications', 'notifications_update_own',
  $p$create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())$p$);

-- ---------------------------------------------------------------------------
-- chat
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('public.chat_conversations', 'chat_conversations_select_own',
  $p$create policy chat_conversations_select_own on public.chat_conversations for select to authenticated using (user_id = auth.uid())$p$);
select pg_temp.ensure_policy('public.chat_conversations', 'chat_conversations_insert_own',
  $p$create policy chat_conversations_insert_own on public.chat_conversations for insert to authenticated with check (user_id = auth.uid())$p$);

select pg_temp.ensure_policy('public.chat_messages', 'chat_messages_select_own_conversation',
  $p$create policy chat_messages_select_own_conversation on public.chat_messages for select to authenticated
     using (conversation_id in (select id from public.chat_conversations where user_id = auth.uid()))$p$);
select pg_temp.ensure_policy('public.chat_messages', 'chat_messages_insert_own_conversation',
  $p$create policy chat_messages_insert_own_conversation on public.chat_messages for insert to authenticated
     with check (sender_type = 'customer' and sender_id = auth.uid()
       and conversation_id in (select id from public.chat_conversations where user_id = auth.uid()))$p$);

-- ---------------------------------------------------------------------------
-- Storage buckets (private). Customer files live under "<user_id>/...".
-- Admins view files through service-role signed URLs, so no admin policy.
-- ---------------------------------------------------------------------------
select pg_temp.ensure_policy('storage.objects', 'claim_evidence_objects_insert_own',
  $p$create policy claim_evidence_objects_insert_own on storage.objects for insert to authenticated
     with check (bucket_id = 'claim-evidence' and (storage.foldername(name))[1] = auth.uid()::text)$p$);
select pg_temp.ensure_policy('storage.objects', 'claim_evidence_objects_select_own',
  $p$create policy claim_evidence_objects_select_own on storage.objects for select to authenticated
     using (bucket_id = 'claim-evidence' and (storage.foldername(name))[1] = auth.uid()::text)$p$);

select pg_temp.ensure_policy('storage.objects', 'verification_docs_objects_insert_own',
  $p$create policy verification_docs_objects_insert_own on storage.objects for insert to authenticated
     with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text)$p$);
select pg_temp.ensure_policy('storage.objects', 'verification_docs_objects_select_own',
  $p$create policy verification_docs_objects_select_own on storage.objects for select to authenticated
     using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text)$p$);

select pg_temp.ensure_policy('storage.objects', 'profile_photos_objects_insert_own',
  $p$create policy profile_photos_objects_insert_own on storage.objects for insert to authenticated
     with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$);
select pg_temp.ensure_policy('storage.objects', 'profile_photos_objects_update_own',
  $p$create policy profile_photos_objects_update_own on storage.objects for update to authenticated
     using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$);
select pg_temp.ensure_policy('storage.objects', 'profile_photos_objects_select_own',
  $p$create policy profile_photos_objects_select_own on storage.objects for select to authenticated
     using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$);

-- ---------------------------------------------------------------------------
-- One-off backfill (optional): re-link verification documents that were
-- stranded with session_id = null by the old RLS-scoped linking code.
-- Links each orphan to that user's most recent session submitted after the
-- upload. Review before running; the admin screen already falls back to
-- showing unlinked documents, so this is only for data tidiness.
-- ---------------------------------------------------------------------------
-- update public.verification_documents d
-- set session_id = (
--   select vs.id from public.verification_sessions vs
--   where vs.user_id = d.user_id and vs.submitted_at >= d.created_at
--   order by vs.submitted_at asc limit 1
-- )
-- where d.session_id is null;
