'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import styles from './VerificationQueue.module.css';

// Turns raw database values like "no_anomaly_detected" into readable
// text — no underscores, no raw enum leaking into the admin UI.
function humanize(value) {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

export default function VerificationQueue({ sessions }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(sessions[0]?.id ?? null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [runningAi, setRunningAi] = useState(false);
  const [reasonPrompt, setReasonPrompt] = useState(null); // 'rejected' | 'additional_info_required' | null
  const [reasonText, setReasonText] = useState('');

  async function selectSession(id) {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/verification/${id}/detail`);
      if (res.ok) setDetail(await res.json());
    } catch {
      // detail panel stays on previous/empty state on failure
    }
    setLoadingDetail(false);
  }

  async function updateStatus(status, reason) {
    if (status === 'verified' && !confirm('Approve this verification? This notifies the customer by email and in-app notification.')) return;

    setUpdating(true);
    const res = await fetch(`/api/admin/verification/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    if (res.ok) {
      router.refresh();
      selectSession(selectedId);
    }
    setUpdating(false);
    setReasonPrompt(null);
    setReasonText('');
  }

  function startReasonFlow(status) {
    setReasonPrompt(status);
  }

  function submitReason() {
    if (!reasonText.trim()) {
      alert('Please enter a reason — the customer sees this, and a blank reason isn\'t useful to them.');
      return;
    }
    updateStatus(reasonPrompt, reasonText.trim());
  }

  async function rerunAi() {
    setRunningAi(true);
    const res = await fetch(`/api/admin/verification/${selectedId}/rerun-ai`, { method: 'POST' });
    if (res.ok) {
      selectSession(selectedId);
    } else {
      const json = await res.json();
      alert(json.error ?? 'Could not run AI check.');
    }
    setRunningAi(false);
  }

  if (sessions.length === 0) {
    return <div className={styles.emptyState}>No verification submissions right now.</div>;
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.list}>
        {sessions.map((s) => (
          <button
            key={s.id}
            className={`${styles.row} ${selectedId === s.id ? styles.active : ''}`}
            onClick={() => selectSession(s.id)}
            type="button"
          >
            <div>
              <div className={styles.name}>{s.profiles?.first_name} {s.profiles?.last_name}</div>
              <div className={styles.sub}>{s.id_type} · {new Date(s.submitted_at).toLocaleDateString()}</div>
            </div>
            <StatusBadge status={s.status} />
          </button>
        ))}
      </div>

      <div className={styles.detail}>
        {loadingDetail && <div className={styles.skeleton} />}

        {!loadingDetail && detail && (
          <>
            <div className={styles.detailHead}>
              <h2>{detail.session.profiles?.first_name} {detail.session.profiles?.last_name}</h2>
              <div className={styles.detailSub}>
                {detail.session.legal_first_name} {detail.session.legal_last_name} · {detail.session.id_type} · DOB {detail.session.date_of_birth ?? '—'}
              </div>
              <div className={styles.detailSub}>{detail.session.address}, {detail.session.city} {detail.session.zip_code}</div>
            </div>

            <div className={styles.detailGrid}>
              <div>
                <div className={styles.card}>
                  <h3>Submitted documents</h3>
                  <div className={styles.docGrid}>
                    {detail.documents.length === 0 && <p className={styles.muted}>No documents found.</p>}
                    {detail.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.signedUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.docCard}
                      >
                        {doc.signedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={doc.signedUrl} alt={doc.doc_type} className={styles.docImg} />
                        ) : (
                          <div className={styles.docImgFallback}>Preview unavailable</div>
                        )}
                        <span>{doc.doc_type}</span>
                      </a>
                    ))}
                  </div>
                  <p className={styles.linkExpiry}>Links expire in 5 minutes for security. Re-select this record to refresh them.</p>
                </div>
              </div>

              <div>
                {detail.internalReview && (
                  <div className={styles.internalCard}>
                    <div className={styles.internalLabel}>Internal only — not visible to customer</div>
                    <div className={styles.internalRow}><span>Automated check</span><span>{humanize(detail.internalReview.automated_check_result)}</span></div>
                    <div className={styles.internalRow}><span>Risk indicator</span><span>{humanize(detail.internalReview.risk_indicator)}</span></div>
                    <p className={styles.internalNote}>{detail.internalReview.reviewer_notes}</p>
                    <button className={styles.rerunBtn} onClick={rerunAi} disabled={runningAi} type="button">
                      {runningAi ? 'Running…' : 'Run AI check again'}
                    </button>
                  </div>
                )}
                {!detail.internalReview && (
                  <div className={styles.internalCard}>
                    <div className={styles.internalLabel}>Internal only — not visible to customer</div>
                    <p className={styles.internalNote}>No automated screening result available for this submission. Review manually, or run it now.</p>
                    <button className={styles.rerunBtn} onClick={rerunAi} disabled={runningAi} type="button">
                      {runningAi ? 'Running…' : 'Run AI check'}
                    </button>
                  </div>
                )}

                <div className={styles.card}>
                  <h3>Decision</h3>

                  {reasonPrompt ? (
                    <div>
                      <p className={styles.reasonLabel}>
                        {reasonPrompt === 'rejected' ? 'Why is this being rejected?' : 'What additional information is needed?'}
                        {' '}The customer will see this exact text.
                      </p>
                      <textarea
                        className={styles.reasonInput}
                        value={reasonText}
                        onChange={(e) => setReasonText(e.target.value)}
                        placeholder={reasonPrompt === 'rejected' ? 'e.g. The photo on your ID is too blurry to verify' : 'e.g. Please upload a photo of the back of your ID as well'}
                        rows={3}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className={styles.infoBtn} onClick={() => { setReasonPrompt(null); setReasonText(''); }} disabled={updating} type="button">Cancel</button>
                        <button className={reasonPrompt === 'rejected' ? styles.rejectBtn : styles.infoBtn} onClick={submitReason} disabled={updating} type="button">
                          {updating ? 'Sending…' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button className={styles.approveBtn} onClick={() => updateStatus('verified')} disabled={updating} type="button">Approve</button>
                      <button className={styles.infoBtn} onClick={() => startReasonFlow('additional_info_required')} disabled={updating} type="button">Request more info</button>
                      <button className={styles.rejectBtn} onClick={() => startReasonFlow('rejected')} disabled={updating} type="button">Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}