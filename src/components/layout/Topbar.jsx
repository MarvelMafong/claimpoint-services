import NotificationsBell from '@/components/notifications/NotificationsBell';
import LogoutButton from '@/components/layout/LogoutButton';
import { getNotifications } from '@/lib/data/notifications';
import styles from './Topbar.module.css';

export default async function Topbar() {
  const { notifications } = await getNotifications();

  return (
    <div className={styles.topbar}>
      <div />
      <div className={styles.actions}>
        <NotificationsBell initialNotifications={notifications} />
        <LogoutButton />
      </div>
    </div>
  );
}