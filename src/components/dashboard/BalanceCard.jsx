'use client';

import { useState } from 'react';
import styles from './BalanceCard.module.css';

export default function BalanceCard({ account }) {
  const [hidden, setHidden] = useState(false);

  if (!account) {
    return (
      <div className={styles.card}>
        <p className={styles.emptyText}>No account found yet.</p>
      </div>
    );
  }

  const formatted = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className={styles.card}>
      <div className={styles.labelRow}>
        <span className={styles.label}>Available balance</span>
        <button
          type="button"
          className={styles.toggle}
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
          onClick={() => setHidden((h) => !h)}
        >
          {hidden ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A11 11 0 0123 12s-1.2 2.1-3.4 3.9M6.3 6.3C3.9 7.9 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9" stroke="rgba(255,255,255,0.75)" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="rgba(255,255,255,0.75)" strokeWidth="1.7" />
              <circle cx="12" cy="12" r="3" stroke="rgba(255,255,255,0.75)" strokeWidth="1.7" />
            </svg>
          )}
        </button>
      </div>
      <div className={styles.amount}>{hidden ? '••••••' : formatted(account.available_balance)}</div>
      <div className={styles.subRow}>
        <div className={styles.subItem}>
          Pending
          <strong>{hidden ? '••••' : formatted(account.pending_balance)}</strong>
        </div>
        <div className={styles.subItem}>
          {account.display_name}
          <strong>{account.masked_number ?? ''}</strong>
        </div>
      </div>
    </div>
  );
}