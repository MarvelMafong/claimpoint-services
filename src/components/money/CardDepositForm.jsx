'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CardDepositForm.module.css';

export default function CardDepositForm({ accounts }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/transactions/card-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, accountId, cardNumber }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong.');
        setSubmitting(false);
        return;
      }
      setSuccess(json);
      setSubmitting(false);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className={styles.successCard}>
        <h3>Card deposit submitted</h3>
        <p>Reference {success.transaction.reference}</p>
        <p className={styles.testNote}>This is a test flow — no real card was charged, no real money moved.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.testBanner}>Test mode — card numbers are never stored, no real charge occurs.</div>
      {error && <div className={styles.inlineError}>{error}</div>}

      <div className={styles.field}>
        <label>Amount</label>
        <input type="text" placeholder="$0.00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={submitting} />
      </div>
      <div className={styles.field}>
        <label>Deposit into</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} disabled={submitting}>
          {accounts.map((a) => (<option key={a.id} value={a.id}>{a.display_name}</option>))}
        </select>
      </div>
      <div className={styles.field}>
        <label>Card number</label>
        <input type="text" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} disabled={submitting} maxLength={19} />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label>Expiry</label>
          <input type="text" placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} disabled={submitting} maxLength={5} />
        </div>
        <div className={styles.field}>
          <label>CVV</label>
          <input type="text" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} disabled={submitting} maxLength={4} />
        </div>
      </div>
      <button className={styles.btnPrimary} type="submit" disabled={submitting}>
        {submitting ? 'Processing…' : 'Add money via card'}
      </button>
    </form>
  );
}