'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './ClaimsIntakeFlow.module.css';

const DRAFT_KEY = 'claimpoint_claim_draft';

const stepOrder = {
  unauthorized: ['category', 'details', 'evidence', 'review'],
  merchant: ['category', 'details', 'evidence', 'review'],
  crypto: ['category', 'details', 'evidence', 'review'],
  investment: ['category', 'details', 'evidence', 'review'],
  other: ['category', 'details', 'evidence', 'review'],
  scam: ['category', 'details', 'communications', 'evidence', 'review'],
};

const categories = [
  { id: 'unauthorized', label: 'Unauthorized transaction', desc: "A charge or transfer you didn't make" },
  { id: 'merchant', label: 'Merchant / service dispute', desc: 'Paid for something not received' },
  { id: 'crypto', label: 'Crypto / digital asset loss', desc: 'Lost funds in a wallet, exchange, or transfer' },
  { id: 'scam', label: 'Romance / online / impersonation scam', desc: 'Manipulated into sending money' },
  { id: 'investment', label: 'Investment-related loss', desc: 'A fraudulent or misrepresented investment' },
  { id: 'other', label: 'Something else', desc: 'Not sure, or a different kind of loss' },
];

export default function ClaimsIntakeFlow() {
  const router = useRouter();
  const [category, setCategory] = useState(null);
  const [stepKey, setStepKey] = useState('category');
  const [details, setDetails] = useState({});
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCategory(parsed.category ?? null);
        setStepKey(parsed.stepKey ?? 'category');
        setDetails(parsed.details ?? {});
        setEvidenceFiles(parsed.evidenceFiles ?? []);
      } catch {
        // corrupted draft — ignore and start fresh
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ category, stepKey, details, evidenceFiles }));
  }, [category, stepKey, details, evidenceFiles]);

  const order = stepOrder[category] ?? stepOrder.other;
  const stepIndex = order.indexOf(stepKey);
  const totalSteps = order.length;

  function goNext() {
    const next = order[stepIndex + 1];
    if (next) setStepKey(next);
  }
  function goBack() {
    const prev = order[stepIndex - 1];
    if (prev) setStepKey(prev);
  }
  function selectCategory(id) {
    setCategory(id);
  }
  function updateDetail(key, value) {
    setDetails((d) => ({ ...d, [key]: value }));
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/claims/evidence', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Upload failed. Please try again.');
      } else {
        setEvidenceFiles((prev) => [...prev, { id: json.evidence.id, file_name: json.evidence.file_name }]);
      }
    } catch {
      setError('Upload failed. Check your connection and try again.');
    }
    setUploading(false);
  }

  function removeFile(id) {
    setEvidenceFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleSubmit() {
    if (!agreed) {
      setError('Please confirm the statement below before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          details,
          evidenceFileIds: evidenceFiles.map((f) => f.id),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong submitting your claim.');
        setSubmitting(false);
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      router.push(`/claims/${json.claim.id}?submitted=true`);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (confirm('Cancel this claim draft? Your progress will be lost. This cannot be undone.')) {
      localStorage.removeItem(DRAFT_KEY);
      router.push('/dashboard');
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div className={styles.brand}>ClaimPoint</div>
        <div className={styles.actions}>
          <span className={styles.saved}>Draft saved automatically</span>
          {/* Previously missing entirely — Cancel was the only way to
              leave, forcing the destructive confirmation every time. */}
          <Link href="/dashboard" className={styles.exitLink}>Save &amp; exit</Link>
          <button className={styles.exitBtn} onClick={handleCancel} type="button">Cancel</button>
        </div>
      </div>

      {stepKey !== 'success' && (
        <div className={styles.progressWrap}>
          <div className={styles.progressLabelRow}>
            <span>Step {stepIndex + 1} of {totalSteps}</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
          </div>
        </div>
      )}

      <div className={styles.body}>
        {error && <div className={styles.inlineError}>{error}</div>}

        {stepKey === 'category' && (
          <div>
            <h1>What happened?</h1>
            <p className={styles.sub}>Choose the category that best matches your situation.</p>
            <div className={styles.categoryGrid}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.categoryCard} ${category === c.id ? styles.selected : ''}`}
                  onClick={() => selectCategory(c.id)}
                >
                  <h4>{c.label}</h4>
                  <p>{c.desc}</p>
                </button>
              ))}
            </div>
            <button className={styles.btnPrimary} disabled={!category} onClick={goNext} type="button">
              Continue
            </button>
          </div>
        )}

        {stepKey === 'details' && (
          <div>
            <h1>Tell us what happened</h1>
            <p className={styles.sub}>These questions are specific to the category you selected.</p>
            <div className={styles.field}>
              <label>Amount involved</label>
              <input type="text" placeholder="$0.00" value={details.amount ?? ''} onChange={(e) => updateDetail('amount', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Date it occurred</label>
              <input type="date" value={details.date ?? ''} onChange={(e) => updateDetail('date', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>What happened</label>
              <textarea placeholder="Describe the situation" value={details.description ?? ''} onChange={(e) => updateDetail('description', e.target.value)} />
            </div>
            <div className={styles.navRow}>
              <button className={styles.btnGhost} onClick={goBack} type="button">Back</button>
              <button className={styles.btnPrimary} onClick={goNext} type="button">Continue</button>
            </div>
          </div>
        )}

        {stepKey === 'communications' && (
          <div>
            <h1>Relationship and communication</h1>
            <p className={styles.sub}>Scam cases involving manipulation typically need a bit more context.</p>
            <div className={styles.field}>
              <label>Platform(s) used to communicate</label>
              <input type="text" placeholder="e.g. WhatsApp, Instagram, email" value={details.platform ?? ''} onChange={(e) => updateDetail('platform', e.target.value)} />
            </div>
            <div className={styles.navRow}>
              <button className={styles.btnGhost} onClick={goBack} type="button">Back</button>
              <button className={styles.btnPrimary} onClick={goNext} type="button">Continue</button>
            </div>
          </div>
        )}

        {stepKey === 'evidence' && (
          <div>
            <h1>Add supporting evidence</h1>
            <p className={styles.sub}>Screenshots, statements, receipts, or communication that supports your claim.</p>
            <label className={styles.uploadZone}>
              <input type="file" hidden onChange={handleFileUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.heic" />
              <h4>{uploading ? 'Uploading…' : 'Tap to upload a file'}</h4>
              <p>PDF, JPG, PNG, HEIC up to 25MB each</p>
            </label>
            {evidenceFiles.map((f) => (
              <div className={styles.fileRow} key={f.id}>
                <span>{f.file_name}</span>
                <button type="button" onClick={() => removeFile(f.id)}>Remove</button>
              </div>
            ))}
            <div className={styles.navRow}>
              <button className={styles.btnGhost} onClick={goBack} type="button">Back</button>
              <button className={styles.btnPrimary} onClick={goNext} type="button">Continue</button>
            </div>
          </div>
        )}

        {stepKey === 'review' && (
          <div>
            <h1>Review before you submit</h1>
            <p className={styles.sub}>
              Once submitted, your evidence moves into review and can&apos;t be casually edited.
            </p>
            <div className={styles.reviewCard}>
              <div className={styles.reviewRow}><span>Category</span><span>{categories.find((c) => c.id === category)?.label}</span></div>
              <div className={styles.reviewRow}><span>Amount</span><span>{details.amount || '—'}</span></div>
              <div className={styles.reviewRow}><span>Files attached</span><span>{evidenceFiles.length}</span></div>
            </div>
            <div className={styles.feeBanner}>
              No fee unless we recover funds. If a fee applies upon successful recovery, you&apos;ll see the exact amount before anything is deducted.
            </div>
            <label className={styles.agreeRow}>
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              I confirm this information is accurate, and I understand ClaimPoint cannot guarantee recovery.
            </label>
            <div className={styles.navRow}>
              <button className={styles.btnGhost} onClick={goBack} type="button" disabled={submitting}>Back</button>
              <button className={styles.btnPrimary} onClick={handleSubmit} type="button" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit claim'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}