'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './OpenProductForm.module.css';

export default function OpenProductForm({ product, fundingAccounts, onClose }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState(fundingAccounts[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/products/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, amount, fromAccountId }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {success ? (
          <>
            <h3>{product.name} opened</h3>
            <p>Your new account is ready and will appear in Accounts.</p>
            <button className={styles.btnPrimary} onClick={onClose} type="button">Done</button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>Open {product.name}</h3>
            <p className={styles.terms}>
              {product.apy}% APY
              {product.term_months && ` · ${product.term_months} month term`}
              {' · '}Minimum ${Number(product.min_amount).toLocaleString()}
            </p>

            {error && <div className={styles.inlineError}>{error}</div>}

            <div className={styles.field}>
              <label>Amount</label>
              <input type="text" placeholder="$0.00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={submitting} />
            </div>

            <div className={styles.field}>
              <label>Fund from</label>
              <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} disabled={submitting}>
                {fundingAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name}</option>
                ))}
              </select>
            </div>

            <div className={styles.actions}>
              <button className={styles.btnGhost} onClick={onClose} type="button" disabled={submitting}>Cancel</button>
              <button className={styles.btnPrimary} type="submit" disabled={submitting}>
                {submitting ? 'Opening…' : 'Open account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}