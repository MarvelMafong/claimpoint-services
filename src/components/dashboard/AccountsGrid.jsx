'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountsGrid({ accounts }) {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [closingId, setClosingId] = useState(null);

  const formatted = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  async function handleClose(account) {
    if (!confirm(`Close ${account.display_name}? The ${formatted(account.available_balance)} balance will move to your Standard Account. This cannot be undone.`)) return;
    setClosingId(account.id);
    const res = await fetch(`/api/accounts/${account.id}/close`, { method: 'POST' });
    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json();
      alert(json.error ?? 'Could not close this account.');
    }
    setClosingId(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12.5, fontWeight: 600, color: 'var(--color-slate)',
            padding: '7px 12px', borderRadius: 8, background: 'var(--color-lavender)',
          }}
        >
          {hidden ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="#686579" strokeWidth="1.7" /><circle cx="12" cy="12" r="3" stroke="#686579" strokeWidth="1.7" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A11 11 0 0123 12s-1.2 2.1-3.4 3.9M6.3 6.3C3.9 7.9 2 12 2 12s3.5 7 10 7c1.6 0 3-.3 4.2-.9" stroke="#686579" strokeWidth="1.7" strokeLinecap="round" /></svg>
          )}
          {hidden ? 'Show balances' : 'Hide balances'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {accounts.map((account) => (
          <div key={account.id} style={{ background: 'var(--color-white)', border: '1px solid var(--color-cloud)', borderRadius: 18, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--color-indigo)', background: 'var(--color-lavender)', padding: '4px 10px', borderRadius: 999 }}>
                {account.account_type.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-success-text)', textTransform: 'capitalize' }}>{account.status}</span>
            </div>
            <h4 style={{ fontSize: 14.5, color: 'var(--color-slate)', fontWeight: 500, marginBottom: 8 }}>{account.display_name}</h4>
            <div style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: 26, marginBottom: 20 }}>
              {hidden ? '••••••' : formatted(account.available_balance)}
            </div>
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--color-cloud)', fontSize: 12.5, color: 'var(--color-slate)' }}>
              {account.masked_number ?? (account.apy ? `${account.apy}% APY` : '')}
            </div>
            {account.account_type !== 'standard_account' && account.status !== 'closed' && (
              <button
                onClick={() => handleClose(account)}
                disabled={closingId === account.id}
                type="button"
                style={{ marginTop: 16, width: '100%', padding: 10, borderRadius: 10, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: 12.5, fontWeight: 600 }}
              >
                {closingId === account.id ? 'Closing…' : 'Close account'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}