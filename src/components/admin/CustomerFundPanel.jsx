'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CustomerFundPanel.module.css';

export default function CustomerFundPanel({ accountId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [availableAt, setAvailableAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/admin/accounts/${accountId}/fund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, availableAt: availableAt || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.');
      setSaving(false);
      return;
    }
    setOpen(false);
    setAmount('');
    setAvailableAt('');
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className={styles.openBtn} onClick={() => setOpen(true)} type="button">
        Add Funds
      </button>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.warning}></div>
      {error && <div className={styles.error}>{error}</div>}
      <input type="text" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={saving} className={styles.input} />
      <label className={styles.dateLabel}>Withdrawal available from (optional)</label>
      <input type="date" value={availableAt} onChange={(e) => setAvailableAt(e.target.value)} disabled={saving} className={styles.input} />
      <div className={styles.actions}>
        <button type="button" onClick={() => setOpen(false)} disabled={saving} className={styles.cancelBtn}>Cancel</button>
        <button type="submit" disabled={saving} className={styles.saveBtn}>{saving ? 'Adding…' : 'Add funds'}</button>
      </div>
    </form>
  );
}






