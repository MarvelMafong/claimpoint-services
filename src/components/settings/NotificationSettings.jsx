'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SettingsForm.module.css';

const options = [
  { key: 'email_transactions', label: 'Transaction emails', desc: 'Deposits, withdrawals, and transfers' },
  { key: 'email_claims', label: 'Claim updates', desc: 'Status changes on your recovery claims' },
  { key: 'email_security', label: 'Security alerts', desc: 'Password changes, new logins' },
  { key: 'email_marketing', label: 'Product updates', desc: 'New features and occasional announcements' },
];

export default function NotificationSettings({ profile }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState(
    profile?.notification_preferences ?? {
      email_transactions: true,
      email_claims: true,
      email_security: true,
      email_marketing: false,
    }
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function toggle(key) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationPreferences: updated }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setPrefs(prefs); // revert on failure
        setMessage({ type: 'error', text: 'Could not save that change.' });
      }
    } catch {
      setPrefs(prefs);
      setMessage({ type: 'error', text: 'Could not save that change.' });
    }
    setSaving(false);
  }

  return (
    <div>
      {message && <div className={styles.errorMsg}>{message.text}</div>}
      <div className={styles.toggleList}>
        {options.map((o) => (
          <div className={styles.toggleRow} key={o.key}>
            <div>
              <div className={styles.toggleLabel}>{o.label}</div>
              <div className={styles.toggleDesc}>{o.desc}</div>
            </div>
            <button
              type="button"
              className={`${styles.switch} ${prefs[o.key] ? styles.on : ''}`}
              onClick={() => toggle(o.key)}
              disabled={saving}
              aria-label={`Toggle ${o.label}`}
            >
              <span className={styles.switchKnob} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}