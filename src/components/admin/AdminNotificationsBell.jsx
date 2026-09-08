'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './AdminNotificationsBell.module.css';

const POLL_INTERVAL_MS = 5000;

export default function AdminNotificationsBell({ initialNotifications }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/notifications');
        if (res.ok) {
          const json = await res.json();
          setNotifications(json.notifications);
        }
      } catch {
        // silent — next poll retries
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

  async function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    fetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
  }

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button className={styles.bellBtn} onClick={() => setOpen((o) => !o)} type="button" aria-label="Notifications">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" stroke="#FCFBF8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
                onClick={() => markRead(n.id)}
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