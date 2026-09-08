'use client';

import { useState } from 'react';
import styles from './DataAndPrivacy.module.css';

export default function DataAndPrivacy() {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  function handleExport() {
    window.location.href = '/api/settings/export-data';
  }

  async function handleDeletionRequest() {
    if (!confirm('This will lock your account and submit it for deletion processing. You will be logged out immediately. Continue?')) return;
    setRequesting(true);
    const res = await fetch('/api/settings/request-deletion', { method: 'POST' });
    if (res.ok) {
      setRequested(true);
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    }
    setRequesting(false);
  }

  return (
    <div className={styles.card}>
      <h3>Data &amp; Privacy</h3>
      <div className={styles.row}>
        <div>
          <div className={styles.label}>Export your data</div>
          <div className={styles.sub}>Download everything ClaimPoint has on file for you, as a JSON file.</div>
        </div>
        <button onClick={handleExport} type="button" className={styles.exportBtn}>Download</button>
      </div>
      <div className={styles.row}>
        <div>
          <div className={styles.label}>Delete your account</div>
          <div className={styles.sub}>Requests permanent deletion. Your account is locked immediately; deletion is processed by ClaimPoint staff.</div>
        </div>
        <button onClick={handleDeletionRequest} type="button" className={styles.deleteBtn} disabled={requesting || requested}>
          {requested ? 'Requested' : requesting ? 'Submitting…' : 'Request deletion'}
        </button>
      </div>
    </div>
  );
}