import AdminSidebar from '@/components/admin/AdminSidebar';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getAdminNotifications } from '@/lib/data/admin-notifications';
import styles from './layout.module.css';

export default async function AdminLayout({ children }) {
  const { user } = await requireAdmin();

  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  const adminName = profile ? `${profile.first_name} ${profile.last_name}` : user.email;
  const { notifications } = await getAdminNotifications();

  return (
    <div className={styles.shell}>
      <AdminSidebar adminName={adminName} notifications={notifications} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}