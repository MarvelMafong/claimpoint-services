'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './MoneyForm.module.css';

// Same deterministic generator used on the admin side — same account
// always shows the same number, computed here purely from the real
// account id, no server round-trip needed.
function generateDisplayAccountNumber(accountId) {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) {
    hash = (hash * 31 + accountId.charCodeAt(i)) >>> 0;
  }
  const digits = String(hash).padStart(10, '0').slice(0, 10);
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 10)}`;
}

export default function MoneyForm({ kind, accounts, verificationStatus, beneficiaries }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState('');
  const [transferType, setTransferType] = useState('internal');
  const [externalBankName, setExternalBankName] = useState('');
  const [externalAccountNumber, setExternalAccountNumber] = useState('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [sourceOrDest, setSourceOrDest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isWithdrawal = kind === 'withdrawal';
  const isTransfer = kind === 'transfer';
  const isDeposit = kind === 'deposit';

  const verificationBlocked = isWithdrawal && verificationStatus !== 'verified';

  const labels = {
    deposit: { title: 'Deposit', sub: 'Add funds to your account.', cta: 'Deposit funds' },
    withdrawal: { title: 'Withdraw', sub: 'Move funds out to a linked destination.', cta: 'Withdraw funds' },
    transfer: { title: 'Transfer', sub: 'Move funds within ClaimPoint or to an external bank.', cta: 'Send transfer' },
  }[kind];

  // Picking a saved beneficiary auto-fills the destination field(s) —
  // previously beneficiaries could only be saved, never actually used.
  function applyBeneficiary(id) {
    setSelectedBeneficiaryId(id);
    const b = beneficiaries?.find((item) => item.id === id);
    if (!b) return;
    if (isWithdrawal) {
      setSourceOrDest(`${b.bank_name} — ${b.account_number} (${b.nickname || b.beneficiary_name})`);
    } else if (isTransfer && transferType === 'external') {
      setExternalBankName(b.bank_name);
      setExternalAccountNumber(b.account_number);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (isTransfer && transferType === 'external' && (!externalBankName || !externalAccountNumber)) {
      setError('Enter the receiving bank name and account number.');
      return;
    }

    const endpoint = `/api/transactions/${kind}`;
    const body = isTransfer
      ? {
          amount,
          fromAccountId: accountId,
          transferType,
          toAccountId: transferType === 'internal' ? toAccountId : null,
          externalBankName: transferType === 'external' ? externalBankName : null,
          externalAccountNumber: transferType === 'external' ? externalAccountNumber : null,
        }
      : isDeposit
        ? { amount, accountId, source: sourceOrDest }
        : { amount, accountId, destination: sourceOrDest };

    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      setSuccess(json);
      setSubmitting(false);
      router.refresh();
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  if (verificationBlocked) {
    return (
      <div className={styles.restrictedBanner}>
        <h4>Verification required</h4>
        <p>Withdrawals are limited until identity verification is complete.</p>
        <a href="/verify">Finish verification →</a>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.successCard}>
        <h3>{labels.title} submitted</h3>
        <p>Reference {success.transaction.reference}</p>
        <p className={styles.pendingNote}>
          Your {labels.title.toLowerCase()} is being processed — this usually shows as pending while it moves through review. We'll notify you the moment it updates.
        </p>
        {success.sandbox && (
          <p className={styles.sandboxNote}>
            This account is in sandbox mode — no real funds have moved. Your request is recorded and will process automatically once production banking is connected.
          </p>
        )}
        <button className={styles.btnGhost} onClick={() => setSuccess(null)} type="button">
          {labels.title} again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h1>{labels.title}</h1>
      <p className={styles.sub}>{labels.sub}</p>

      {error && <div className={styles.inlineError}>{error}</div>}

      {isTransfer && (
        <div className={styles.toggleRow}>
          <button type="button" className={`${styles.toggleBtn} ${transferType === 'internal' ? styles.toggleActive : ''}`} onClick={() => setTransferType('internal')}>
            Within ClaimPoint
          </button>
          <button type="button" className={`${styles.toggleBtn} ${transferType === 'external' ? styles.toggleActive : ''}`} onClick={() => setTransferType('external')}>
            To an external bank
          </button>
        </div>
      )}

      <div className={styles.field}>
        <label>Amount</label>
        <input type="text" placeholder="$0.00" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={submitting} />
      </div>

      <div className={styles.field}>
        <label>{isTransfer ? 'From account' : 'Account'}</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} disabled={submitting}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.display_name} · #{generateDisplayAccountNumber(a.id)}</option>
          ))}
        </select>
      </div>

      {isTransfer && transferType === 'internal' && (
        <div className={styles.field}>
          <label>To account</label>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} disabled={submitting}>
            <option value="">Select an account</option>
            {accounts.filter((a) => a.id !== accountId).map((a) => (
              <option key={a.id} value={a.id}>{a.display_name} · #{generateDisplayAccountNumber(a.id)}</option>
            ))}
          </select>
        </div>
      )}

      {beneficiaries?.length > 0 && (isWithdrawal || (isTransfer && transferType === 'external')) && (
        <div className={styles.field}>
          <label>Use a saved beneficiary (optional)</label>
          <select value={selectedBeneficiaryId} onChange={(e) => applyBeneficiary(e.target.value)} disabled={submitting}>
            <option value="">Enter details manually</option>
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>{b.nickname || b.beneficiary_name} — {b.bank_name}</option>
            ))}
          </select>
        </div>
      )}

      {isTransfer && transferType === 'external' && (
        <>
          <div className={styles.field}>
            <label>Receiving bank name</label>
            <input type="text" placeholder="e.g. Chase" value={externalBankName} onChange={(e) => setExternalBankName(e.target.value)} disabled={submitting} />
          </div>
          <div className={styles.field}>
            <label>Account number</label>
            <input type="text" placeholder="Account number" value={externalAccountNumber} onChange={(e) => setExternalAccountNumber(e.target.value)} disabled={submitting} />
          </div>
        </>
      )}

      {!isTransfer && (
        <div className={styles.field}>
          <label>{isDeposit ? 'Source' : 'Destination'}</label>
          <input
            type="text"
            placeholder={isDeposit ? 'e.g. linked bank account' : 'e.g. bank account ending 4821'}
            value={sourceOrDest}
            onChange={(e) => setSourceOrDest(e.target.value)}
            disabled={submitting}
          />
        </div>
      )}

      <button className={styles.btnPrimary} type="submit" disabled={submitting}>
        {submitting ? 'Processing…' : labels.cta}
      </button>
    </form>
  );
}