'use client';

import { useState } from 'react';
import styles from './SettingsForm.module.css';

export default function SecuritySettings({ loginHistory = [] }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Visual only, matches the rest of the sandbox pattern — no real bank
  // partner means no real 2FA provider connected yet. This demonstrates
  // exactly what the toggle and setup steps will look like once one is.
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [showTwoFaSetup, setShowTwoFaSetup] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password updated.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: json.error ?? 'Something went wrong.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    }
    setSaving(false);
  }

  function toggleTwoFa() {
    if (!twoFaEnabled) {
      setShowTwoFaSetup(true);
    } else {
      setTwoFaEnabled(false);
    }
  }

  return (
    <div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h3 className={styles.sectionTitle}>Change password</h3>
        {message && (
          <div className={message.type === 'success' ? styles.successMsg : styles.errorMsg}>{message.text}</div>
        )}
        <div className={styles.field}>
          <label>Current password</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={saving} autoComplete="current-password" />
        </div>
        <div className={styles.field}>
          <label>New password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={saving} autoComplete="new-password" />
        </div>
        <div className={styles.field}>
          <label>Confirm new password</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={saving} autoComplete="new-password" />
        </div>
        <button className={styles.btnPrimary} type="submit" disabled={saving}>
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <div style={{ marginTop: 40 }}>
        <h3 className={styles.sectionTitle}>Two-factor authentication</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--color-white)', border: '1px solid var(--color-cloud)', borderRadius: 14 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>SMS authentication</div>
            <div style={{ fontSize: 12, color: 'var(--color-slate)' }}>{twoFaEnabled ? 'Enabled' : 'Not enabled'}</div>
          </div>
          <button
            type="button"
            onClick={toggleTwoFa}
            style={{
              width: 44, height: 24, borderRadius: 999,
              background: twoFaEnabled ? 'var(--color-indigo)' : 'var(--color-cloud)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: 2, left: twoFaEnabled ? 22 : 2,
              width: 20, height: 20, borderRadius: '50%', background: 'var(--color-white)',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>

        {showTwoFaSetup && (
          <div style={{ marginTop: 14, padding: 20, background: 'var(--color-lavender)', borderRadius: 14 }}>
            <p style={{ fontSize: 12.5, color: 'var(--color-slate)', marginBottom: 14 }}>
              Step 1 of 2: Enter your phone number to receive a verification code.
            </p>
            <input type="tel" placeholder="Phone number" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1.5px solid var(--color-cloud)', marginBottom: 12, fontSize: 13.5 }} />
            <button
              type="button"
              onClick={() => { setTwoFaEnabled(true); setShowTwoFaSetup(false); }}
              style={{ width: '100%', padding: 12, borderRadius: 10, background: 'var(--color-indigo)', color: 'var(--color-white)', fontSize: 13.5, fontWeight: 600 }}
            >
              Send verification code
            </button>
          </div>
        )}
      </div>

      <h3 className={styles.sectionTitle} style={{ marginTop: 40 }}>Recent logins</h3>
      {loginHistory.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-slate)' }}>No login history yet.</p>
      ) : (
        <div style={{ background: 'var(--color-white)', border: '1px solid var(--color-cloud)', borderRadius: 12, overflow: 'hidden' }}>
          {loginHistory.map((entry, i) => (
            <div key={i} style={{ padding: '12px 16px', borderBottom: i < loginHistory.length - 1 ? '1px solid var(--color-cloud)' : 'none', fontSize: 13 }}>
              {new Date(entry.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}