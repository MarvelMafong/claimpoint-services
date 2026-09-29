'use client';

import { useEffect, useState } from 'react';
import StatusBadge from '@/components/ui/StatusBadge';
import AdminEvidenceAndComments from './AdminEvidenceAndComments';
import styles from './ClaimsWorkspace.module.css';

const statusOptions = [
  'under_review', 'investigation', 'evidence_required', 'recovery_process',
  'recovered', 'partially_recovered', 'not_recovered', 'closed',
];

export default function ClaimsWorkspace({ initialClaims, loadError }) {
  const [claims, setClaims] = useState(initialClaims);
  const [selectedId, setSelectedId] = useState(initialClaims[0]?.id ?? null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Load the first claim's detail on mount — previously the first row
  // was highlighted but the detail panel stayed empty until clicked.
  useEffect(() => {
    if (initialClaims[0]?.id) selectClaim(initialClaims[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshDetail() {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/admin/claims/${selectedId}`);
      if (res.ok) setDetail(await res.json());
    } catch {
      // keep showing the previous detail
    }
  }

  async function selectClaim(id) {
    setSelectedId(id);
    setLoadingDetail(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/admin/claims/${id}`);
      if (res.ok) {
        const json = await res.json();
        setDetail(json);
        setStatus(json.claim.status);
        setNotes('');
      }
    } catch {
      // detail panel just stays on skeleton/previous state on failure
    }
    setLoadingDetail(false);
  }

  async function handleSaveStatus() {
    if (!confirm(`Update this case to "${status}" and notify the customer by email and in-app notification?`)) {
      return;
    }
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/admin/claims/${selectedId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) {
        setSaveMessage('Status updated. Customer notified.');
        setClaims((prev) => prev.map((c) => (c.id === selectedId ? { ...c, status } : c)));
      } else {
        setSaveMessage('Something went wrong saving this update.');
      }
    } catch {
      setSaveMessage('Something went wrong saving this update.');
    }
    setSaving(false);
  }

  if (claims.length === 0) {
    return (
      <div className={styles.emptyWrap}>
        <h3>No claims yet</h3>
        <p>Submitted recovery claims will appear here for review.</p>
      </div>
    );
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.list}>
        {loadError && <div className={styles.inlineError}>Couldn&apos;t load all claims.</div>}
        {claims.map((claim) => (
          <button
            key={claim.id}
            className={`${styles.claimRow} ${selectedId === claim.id ? styles.active : ''}`}
            onClick={() => selectClaim(claim.id)}
            type="button"
          >
            <div className={styles.claimRowHead}>
              <div>
                <div className={styles.claimCust}>{claim.profiles?.first_name} {claim.profiles?.last_name}</div>
                <div className={styles.claimCat}>{claim.category}</div>
              </div>
              <StatusBadge status={claim.status} />
            </div>
            <div className={styles.claimRef}>{claim.reference}</div>
          </button>
        ))}
      </div>

      <div className={styles.detail}>
        {loadingDetail && <div className={styles.skeleton} />}

        {!loadingDetail && detail && (
          <>
            <div className={styles.detailHead}>
              <h2>{detail.claim.profiles?.first_name} {detail.claim.profiles?.last_name}</h2>
              <div className={styles.detailSub}>{detail.claim.reference} · {detail.claim.category}</div>
            </div>

            <div className={styles.detailGrid}>
              <div>
                <div className={styles.card}>
                  <h3>Customer-submitted details</h3>
                  {Object.entries(detail.claim.details ?? {}).map(([key, value]) => (
                    <div className={styles.qaItem} key={key}>
                      <div className={styles.qaQ}>{key}</div>
                      <div className={styles.qaA}>{String(value)}</div>
                    </div>
                  ))}
                </div>

                <AdminEvidenceAndComments
                  claimId={selectedId}
                  evidence={detail.evidence ?? []}
                  comments={detail.comments ?? []}
                  onChanged={refreshDetail}
                />
              </div>

              <div>
                {detail.internalReview && (
                  <div className={styles.internalCard}>
                    <div className={styles.internalLabel}>Internal only — not visible to customer</div>
                    <div className={styles.internalRow}><span>Automated check</span><span>{detail.internalReview.automated_check_result}</span></div>
                    <div className={styles.internalRow}><span>Risk indicator</span><span>{detail.internalReview.risk_indicator}</span></div>
                    <p className={styles.internalNote}>Automated screening is advisory only. Final decisions are made by a human reviewer.</p>
                  </div>
                )}

                <div className={styles.card}>
                  <h3>Update status</h3>
                  <select className={styles.statusSelect} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <textarea
                    className={styles.notesArea}
                    placeholder="Internal reviewer notes (not visible to customer)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  {saveMessage && <div className={styles.saveMessage}>{saveMessage}</div>}
                  <button className={styles.btnPrimary} onClick={handleSaveStatus} disabled={saving} type="button">
                    {saving ? 'Saving…' : 'Save & notify customer'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}