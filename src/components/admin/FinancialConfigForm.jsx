'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AdminForm.module.css';

export default function FinancialConfigForm({ settings }) {
  const router = useRouter();
  const [productionOn, setProductionOn] = useState(settings.production_financial_processing);
  const [confirmModal, setConfirmModal] = useState(null); // 'enable' | 'disable' | null
  const [confirmText, setConfirmText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const [depositsEnabled, setDepositsEnabled] = useState(settings.deposits_enabled);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(settings.withdrawals_enabled);
  const [transfersEnabled, setTransfersEnabled] = useState(settings.transfers_enabled);

  async function saveFeatureToggle(key, value, setter) {
    setter(value);
    await fetch('/api/admin/system-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    router.refresh();
  }

  function requestProductionToggle() {
    setConfirmModal(productionOn ? 'disable' : 'enable');
    setConfirmText('');
    setError(null);
  }

  async function confirmProductionToggle() {
    const newValue = confirmModal === 'enable';
    const expectedPhrase = newValue ? 'ENABLE PRODUCTION' : 'DISABLE PRODUCTION';

    if (confirmText !== expectedPhrase) {
      setError(`Type "${expectedPhrase}" exactly.`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ production_financial_processing: newValue, confirmationPhrase: confirmText }),
      });
      const json = await res.json();

      if (res.ok) {
        setProductionOn(newValue);
        setConfirmModal(null);
        setMessage({ type: 'success', text: `Production processing ${newValue ? 'enabled' : 'disabled'}.` });
        router.refresh();
      } else {
        setError(json.error ?? 'Something went wrong.');
      }
    } catch {
      setError('Something went wrong.');
    }
    setSaving(false);
  }

  return (
    <div>
      {message && <div className={styles.successMsg}>{message.text}</div>}

      <div className={styles.dangerCard}>
        <h3>Production Financial Processing</h3>
        <p className={styles.dangerDesc}>
          {productionOn
            ? 'Real money movement is currently ENABLED. Deposits, withdrawals, and transfers process against live financial infrastructure.'
            : 'Real money movement is currently OFF. Deposits, withdrawals, and transfers are recorded as sandbox transactions only.'}
        </p>
        <button
          className={productionOn ? styles.btnDanger : styles.btnPrimary}
          onClick={requestProductionToggle}
          type="button"
        >
          {productionOn ? 'Disable production processing' : 'Enable production processing'}
        </button>
      </div>

      <h3 className={styles.sectionTitle}>Feature availability</h3>
      <div className={styles.toggleList}>
        <div className={styles.toggleRow}>
          <span>Deposits</span>
          <button className={`${styles.switch} ${depositsEnabled ? styles.on : ''}`} onClick={() => saveFeatureToggle('deposits_enabled', !depositsEnabled, setDepositsEnabled)} type="button">
            <span className={styles.switchKnob} />
          </button>
        </div>
        <div className={styles.toggleRow}>
          <span>Withdrawals</span>
          <button className={`${styles.switch} ${withdrawalsEnabled ? styles.on : ''}`} onClick={() => saveFeatureToggle('withdrawals_enabled', !withdrawalsEnabled, setWithdrawalsEnabled)} type="button">
            <span className={styles.switchKnob} />
          </button>
        </div>
        <div className={styles.toggleRow}>
          <span>Transfers</span>
          <button className={`${styles.switch} ${transfersEnabled ? styles.on : ''}`} onClick={() => saveFeatureToggle('transfers_enabled', !transfersEnabled, setTransfersEnabled)} type="button">
            <span className={styles.switchKnob} />
          </button>
        </div>
      </div>

      {confirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>{confirmModal === 'enable' ? 'Enable production processing?' : 'Disable production processing?'}</h3>
            <p>
              {confirmModal === 'enable'
                ? 'This activates real financial transactions. Only proceed if production infrastructure is configured, compliance requirements are met, and testing is complete.'
                : 'This stops new production financial operations. Existing data, balances, and transaction history are not affected.'}
            </p>
            {error && <div className={styles.errorMsg}>{error}</div>}
            <input
              type="text"
              placeholder={confirmModal === 'enable' ? 'Type ENABLE PRODUCTION' : 'Type DISABLE PRODUCTION'}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={styles.confirmInput}
            />
            <div className={styles.modalActions}>
              <button className={styles.btnGhost} onClick={() => setConfirmModal(null)} type="button" disabled={saving}>Cancel</button>
              <button className={styles.btnDanger} onClick={confirmProductionToggle} type="button" disabled={saving}>
                {saving ? 'Confirming…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}