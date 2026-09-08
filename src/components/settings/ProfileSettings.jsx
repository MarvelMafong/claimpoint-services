'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './SettingsForm.module.css';

export default function ProfileSettings({ profile, currentEmail }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone }),
      });
      const json = await res.json();
      setMessage(res.ok ? { type: 'success', text: 'Profile updated.' } : { type: 'error', text: json.error ?? 'Something went wrong.' });
      if (res.ok) router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    }
    setSaving(false);
  }

  async function handleEmailChange(e) {
    e.preventDefault();
    if (!newEmail || newEmail === currentEmail) return;
    setChangingEmail(true);
    setEmailMessage(null);

    // Supabase handles this directly — it sends a confirmation link to
    // the new address, and the email only actually changes once that
    // link is clicked. Nothing updates here until then.
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
      setEmailMessage({ type: 'error', text: error.message });
    } else {
      setEmailMessage({ type: 'success', text: `Confirmation link sent to ${newEmail}. Your email won't change until you click it.` });
      setNewEmail('');
    }
    setChangingEmail(false);
  }

  return (
    <div>
      <form className={styles.form} onSubmit={handleSubmit}>
        {message && (
          <div className={message.type === 'success' ? styles.successMsg : styles.errorMsg}>{message.text}</div>
        )}
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label>First name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={saving} />
          </div>
          <div className={styles.field}>
            <label>Last name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={saving} />
          </div>
        </div>
        <div className={styles.field}>
          <label>Phone number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
        </div>
        <button className={styles.btnPrimary} type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form className={styles.form} onSubmit={handleEmailChange} style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Email address</h3>
        {emailMessage && (
          <div className={emailMessage.type === 'success' ? styles.successMsg : styles.errorMsg}>{emailMessage.text}</div>
        )}
        <div className={styles.field}>
          <label>Current email</label>
          <input type="email" value={currentEmail ?? ''} disabled />
        </div>
        <div className={styles.field}>
          <label>New email</label>
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com" disabled={changingEmail} />
        </div>
        <button className={styles.btnPrimary} type="submit" disabled={changingEmail || !newEmail}>
          {changingEmail ? 'Sending…' : 'Change email'}
        </button>
      </form>
    </div>
  );
}