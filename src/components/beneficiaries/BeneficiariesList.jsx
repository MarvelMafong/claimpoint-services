'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BeneficiariesList.module.css';

export default function BeneficiariesList({ initialBeneficiaries }) {
  const router = useRouter();
  const [beneficiaries, setBeneficiaries] = useState(initialBeneficiaries);
  const [showForm, setShowForm] = useState(false);
  const [nickname, setNickname] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountLast4, setAccountLast4] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);

    if (!nickname) {
      setError('Give this beneficiary a nickname.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, bankName, accountLast4 }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong.');
        setSubmitting(false);
        return;
      }

      setBeneficiaries((prev) => [json.beneficiary, ...prev]);
      setNickname('');
      setBankName('');
      setAccountLast4('');
      setShowForm(false);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  async function handleRemove(id, name) {
    // Destructive action — confirmation required, per the standing rule.
    if (!confirm(`Remove ${name} from your beneficiaries? This cannot be undone.`)) return;

    const res = await fetch(`/api/beneficiaries/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
      router.refresh();
    }
  }

  return (
    <div>
      {beneficiaries.length === 0 && !showForm && (
        <div className={styles.emptyState}>
          <h4>No beneficiaries yet</h4>
          <p>Add someone you send money to regularly so transfers are quicker next time.</p>
          <button className={styles.btnPrimary} onClick={() => setShowForm(true)} type="button">Add a beneficiary</button>
        </div>
      )}

      {beneficiaries.length > 0 && (
        <div className={styles.list}>
          {beneficiaries.map((b) => (
            <div className={styles.row} key={b.id}>
              <div>
                <div className={styles.name}>{b.nickname}</div>
                <div className={styles.sub}>{b.bank_name}{b.account_last4 ? ` · Ending ${b.account_last4}` : ''}</div>
              </div>
              <button className={styles.removeBtn} onClick={() => handleRemove(b.id, b.nickname)} type="button">Remove</button>
            </div>
          ))}
        </div>
      )}

      {beneficiaries.length > 0 && !showForm && (
        <button className={styles.btnGhost} onClick={() => setShowForm(true)} type="button">Add another beneficiary</button>
      )}

      {showForm && (
        <form className={styles.form} onSubmit={handleAdd}>
          {error && <div className={styles.inlineError}>{error}</div>}
          <div className={styles.field}>
            <label>Nickname</label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label>Bank name</label>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label>Account last 4 digits</label>
            <input type="text" maxLength={4} value={accountLast4} onChange={(e) => setAccountLast4(e.target.value)} disabled={submitting} />
          </div>
          <div className={styles.formActions}>
            <button className={styles.btnGhost} type="button" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
            <button className={styles.btnPrimary} type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add beneficiary'}</button>
          </div>
        </form>
      )}
    </div>
  );
}