'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AdminForm.module.css';

export default function BusinessSettingsForm({ settings }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(settings.company_name ?? '');
  const [supportEmail, setSupportEmail] = useState(settings.support_email ?? '');
  const [supportPhone, setSupportPhone] = useState(settings.support_phone ?? '');
  const [footerLegalNote, setFooterLegalNote] = useState(settings.footer_legal_note ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, supportEmail, supportPhone, footerLegalNote }),
      });
      setMessage(res.ok ? { type: 'success', text: 'Saved. The public site now reflects these changes.' } : { type: 'error', text: 'Could not save.' });
      if (res.ok) router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong.' });
    }
    setSaving(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {message && <div className={message.type === 'success' ? styles.successMsg : styles.errorMsg}>{message.text}</div>}

      <div className={styles.field}>
        <label>Company name</label>
        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={saving} />
      </div>
      <div className={styles.field}>
        <label>Support email</label>
        <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} disabled={saving} />
      </div>
      <div className={styles.field}>
        <label>Support phone</label>
        <input type="tel" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} disabled={saving} />
      </div>
      <div className={styles.field}>
        <label>Footer legal note</label>
        <textarea value={footerLegalNote} onChange={(e) => setFooterLegalNote(e.target.value)} disabled={saving} />
      </div>

      <button className={styles.btnPrimary} type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}