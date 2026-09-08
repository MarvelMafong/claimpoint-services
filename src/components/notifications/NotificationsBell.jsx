'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './NotificationsBell.module.css';

const POLL_INTERVAL_MS = 5000;

// Where each notification type should actually take you — previously
// tapping one only marked it read and went nowhere.
function getNotificationLink(n) {
  if (n.related_entity_type === 'recovery_case' && n.related_entity_id) {
    return `/claims/${n.related_entity_id}`;
  }
  if (n.related_entity_type === 'verification_session') {
    return '/dashboard';
  }
  if (n.related_entity_type === 'transaction') {
    return '/activity';
  }
  return null;
}

export default function NotificationsBell({ initialNotifications }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const json = await res.json();
          setNotifications(json.notifications);
        }
      } catch {
        // silent failure — next poll tries again in 5s
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleClick(n) {
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    fetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});

    const link = getNotificationLink(n);
    if (link) {
      setOpen(false);
      router.push(link);
    }
  }

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button className={styles.bellBtn} onClick={() => setOpen((o) => !o)} type="button" aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" stroke="#17152B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && <span className={styles.dot} />}
      </button>
      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHead}>Notifications</div>
          {notifications.length === 0 ? (
            <div className={styles.emptyState}>No notifications yet.</div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                onClick={() => handleClick(n)}
                type="button"
              >
                <div className={styles.itemTitle}>{n.title}</div>
                <div className={styles.itemMessage}>{n.message}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}