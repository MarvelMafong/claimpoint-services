import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getNotifications({ limit = 20 } = {}) {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getNotifications error:', error.message);
    return { notifications: [], unreadCount: 0, error: error.message };
  }

  const unreadCount = (data ?? []).filter((n) => !n.read).length;
  return { notifications: data ?? [], unreadCount, error: null };
}