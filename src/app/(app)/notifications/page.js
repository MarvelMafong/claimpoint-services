import { getNotifications } from '@/lib/data/notifications';
import styles from './page.module.css';

export const metadata = { title: 'Notifications — ClaimPoint Solutions' };

export default async function NotificationsPage() {
  const { notifications } = await getNotifications({ limit: 50 });

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Notifications</h1>
        <p>Everything that's happened on your account.</p>
      </div>

      {notifications.length === 0 ? (
        <div className={styles.emptyState}>
          <h4>No notifications yet</h4>
          <p>Updates on your claims, verification, and transactions will show up here.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map((n) => (
            <div className={`${styles.row} ${!n.read ? styles.unread : ''}`} key={n.id}>
              <div className={styles.title}>{n.title}</div>
              <div className={styles.message}>{n.message}</div>
              <div className={styles.date}>{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}