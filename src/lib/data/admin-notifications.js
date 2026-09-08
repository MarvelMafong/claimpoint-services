import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function getAdminNotifications() {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return { notifications: [], error: error.message };
  return { notifications: data ?? [], error: null };
}