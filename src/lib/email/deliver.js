import { sendEmail } from './client.js';

// notification_preferences keys used by Settings > Notifications.
export const EMAIL_CATEGORIES = {
  transactions: 'email_transactions',
  claims: 'email_claims',
  security: 'email_security',
  marketing: 'email_marketing',
};

const DEFAULT_PREFS = {
  email_transactions: true,
  email_claims: true,
  email_security: true,
  email_marketing: false,
};

export function isCategoryEnabled(prefs, category) {
  const key = EMAIL_CATEGORIES[category];
  if (!key) return false;
  const value = prefs && typeof prefs === 'object' ? prefs[key] : undefined;
  return value === undefined || value === null ? DEFAULT_PREFS[key] : value === true;
}

async function loadPrefsFromDb(userId) {
  const { getSupabaseServiceClient } = await import('../supabase/server.js');
  const { data, error } = await getSupabaseServiceClient()
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .maybeSingle();
  if (error) console.error('email prefs lookup error:', error.message);
  return data?.notification_preferences ?? null;
}

// Sends one of the four allowed email types, but only if the customer has
// that toggle on. Never throws: a failed email must not fail the action.
export async function deliverEmail({ userId, to, category, subject, html, prefs, send = sendEmail, loadPrefs = loadPrefsFromDb }) {
  try {
    if (!to) return { status: 'skipped', reason: 'no recipient' };
    const effective = prefs !== undefined ? prefs : userId ? await loadPrefs(userId) : null;
    if (!isCategoryEnabled(effective, category)) return { status: 'skipped', reason: 'toggle off' };
    const result = await send({ to, subject, html });
    if (result?.error) return { status: 'failed', error: result.error };
    return { status: 'sent' };
  } catch (e) {
    console.error('deliverEmail failed:', e?.message ?? e);
    return { status: 'failed', error: e?.message ?? String(e) };
  }
}
