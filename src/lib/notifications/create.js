import { getSupabaseServiceClient } from '@/lib/supabase/server';

// Call this from any server-side code where something notification-worthy
// happens: claim status change, verification decision, deposit/withdrawal/
// transfer completing, security events. This is the write-side that was
// missing — NotificationsBell only ever read, nothing wrote.
export async function createNotification({ userId, title, message, type = 'system', relatedEntityType = null, relatedEntityId = null }) {
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId,
  });

  if (error) {
    // Never let a notification failure break the actual action (a claim
    // status update should still succeed even if the notification insert
    // fails) — just log it.
    console.error('createNotification error:', error.message);
  }
}