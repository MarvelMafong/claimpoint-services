'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './VerificationFlow.module.css';

const idOptions = [
  { id: 'license', label: "Driver's license", hasBack: true },
  { id: 'stateid', label: 'State ID card', hasBack: true },
  { id: 'passport', label: 'U.S. passport', hasBack: false },
  { id: 'passportcard', label: 'U.S. passport card', hasBack: true },
];

function getOrder(hasBack) {
  return hasBack
    ? ['personal', 'idtype', 'idfront', 'idback', 'selfie', 'review']
    : ['personal', 'idtype', 'idfront', 'selfie', 'review'];
}

export default function VerificationFlow() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [stepKey, setStepKey] = useState('personal');
  const [personal, setPersonal] = useState({});
  const [idType, setIdType] = useState(null);
  const [documents, setDocuments] = useState({});
  const [previews, setPreviews] = useState({});
  const [uploading, setUploading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const draftKey = userId ? `claimpoint_verification_draft_${userId}` : null;

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStepKey(parsed.stepKey ?? 'personal');
        setPersonal(parsed.personal ?? {});
        setIdType(parsed.idType ?? null);
        setDocuments(parsed.documents ?? {});

        // Re-fetch real preview images for anything already uploaded —
        // the local object URLs from last session are dead, but the
        // actual files are still sitting on the server.
        const savedDocs = parsed.documents ?? {};
        Object.entries(savedDocs).forEach(async ([docType, doc]) => {
          if (!doc?.id) return;
          try {
            const res = await fetch(`/api/verification/documents/signed-url?documentId=${doc.id}`);
            if (res.ok) {
              const json = await res.json();
              if (json.url) {
                setPreviews((p) => ({ ...p, [docType]: json.url }));
              }
            }
          } catch {
            // preview stays empty for this one doc — metadata is still
            // intact, Continue still works, just no thumbnail shows
          }
        });
      } catch {
        // corrupted draft — start fresh
      }
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    localStorage.setItem(draftKey, JSON.stringify({ stepKey, personal, idType, documents }));
  }, [draftKey, stepKey, personal, idType, documents]);

  const selectedIdOption = idOptions.find((o) => o.id === idType);
  const hasBack = selectedIdOption?.hasBack ?? true;
  const order = getOrder(hasBack);
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

  function updatePersonal(key, value) {
    setPersonal((p) => ({ ...p, [key]: value }));
  }

  async function uploadDoc(docType, file) {
    setUploading(docType);
    setError(null);

    const localPreviewUrl = URL.createObjectURL(file);
    setPreviews((p) => ({ ...p, [docType]: localPreviewUrl }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    try {
      const res = await fetch('/api/verification/documents', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Upload failed. Please try again.');
        setPreviews((p) => ({ ...p, [docType]: null }));
      } else {
        setDocuments((d) => ({ ...d, [docType]: json.document }));
      }
    } catch {
      setError('Upload failed. Check your connection and try again.');
      setPreviews((p) => ({ ...p, [docType]: null }));
    }
    setUploading(null);
  }

  function retake(docType) {
    setDocuments((d) => {
      const copy = { ...d };
      delete copy[docType];
      return copy;
    });
    setPreviews((p) => ({ ...p, [docType]: null }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const documentIds = Object.values(documents).map((d) => d.id).filter(Boolean);

    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idType,
          personal: {
            firstName: personal.firstName,
            lastName: personal.lastName,
            dob: personal.dob,
            address: personal.address,
            city: personal.city,
            zip: personal.zip,
          },
          documentIds,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong submitting your verification.');
        setSubmitting(false);
        return;
      }

      if (draftKey) localStorage.removeItem(draftKey);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (confirm('Cancel this verification draft? Your progress and uploaded documents will be deleted. This cannot be undone.')) {
      if (draftKey) localStorage.removeItem(draftKey);
      router.push('/dashboard');
    }
  }

  if (submitted) {
    return (
      <div className={styles.wrap}>
        <div className={styles.body} style={{ textAlign: 'center', paddingTop: 80 }}>
          <h1>Documents submitted</h1>
          <p className={styles.sub}>Your verification is now under review. We&apos;ll notify you as soon as there&apos;s an update.</p>
          <button className={styles.btnPrimary} onClick={() => router.push('/dashboard')} type="button" style={{ marginTop: 24 }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <Image src="/images/claimpoint-icon.jpeg" alt="ClaimPoint" width={22} height={22} className={styles.brandImg} />
          ClaimPoint
        </div>
        <div className={styles.actions}>
          <span className={styles.saved}>Draft saved automatically</span>
          <Link href="/dashboard" className={styles.exitLink}>Save &amp; exit</Link>
          <button className={styles.exitBtn} onClick={handleCancel} type="button">Cancel</button>
        </div>
      </div>

      <div className={styles.progressWrap}>
        <div className={styles.progressLabelRow}>Step {stepIndex + 1} of {totalSteps}</div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
        </div>
      </div>

      <div className={styles.deadlineBanner}>
        6 days remaining to verify before withdrawal limits apply
      </div>

      <div className={styles.body}>
        {error && <div className={styles.inlineError}>{error}</div>}

        {stepKey === 'personal' && (
          <div>
            <h1>Confirm your details</h1>
            <p className={styles.sub}>This should match the government-issued ID you&apos;ll upload next.</p>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Legal first name</label>
                <input type="text" value={personal.firstName ?? ''} onChange={(e) => updatePersonal('firstName', e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Legal last name</label>
                <input type="text" value={personal.lastName ?? ''} onChange={(e) => updatePersonal('lastName', e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label>Date of birth</label>
              <input type="date" value={personal.dob ?? ''} onChange={(e) => updatePersonal('dob', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Residential address</label>
              <input type="text" value={personal.address ?? ''} onChange={(e) => updatePersonal('address', e.target.value)} />
            </div>
            <button className={styles.btnPrimary} onClick={goNext} type="button" disabled={!personal.firstName || !personal.lastName}>
              Continue
            </button>
          </div>
        )}

        {stepKey === 'idtype' && (
          <div>
            <h1>Choose an ID type</h1>
            <p className={styles.sub}>Select the government-issued ID you&apos;d like to upload.</p>
            <div className={styles.idGrid}>
              {idOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles.idCard} ${idType === opt.id ? styles.selected : ''}`}
                  onClick={() => setIdType(opt.id)}
                >
                  <h4>{opt.label}</h4>
                  <p>{opt.hasBack ? 'Front and back required' : 'Photo page only'}</p>
                </button>
              ))}
            </div>
            <div className={styles.navRow}>
              <button className={styles.btnGhost} onClick={goBack} type="button">Back</button>
              <button className={styles.btnPrimary} onClick={goNext} type="button" disabled={!idType}>Continue</button>
            </div>
          </div>
        )}

        {stepKey === 'idfront' && (
          <UploadStep
            title="Capture the front"
            sub="Make sure all four corners are visible and the text is readable."
            uploading={uploading === 'front'}
            uploaded={documents.front}
            previewUrl={previews.front}
            onUpload={(file) => uploadDoc('front', file)}
            onRetake={() => retake('front')}
            onBack={goBack}
            onNext={goNext}
          />
        )}

        {stepKey === 'idback' && (
          <UploadStep
            title="Capture the back"
            sub="The back of your ID confirms additional details."
            uploading={uploading === 'back'}
            uploaded={documents.back}
            previewUrl={previews.back}
            onUpload={(file) => uploadDoc('back', file)}
            onRetake={() => retake('back')}
            onBack={goBack}
            onNext={goNext}
          />
        )}

        {stepKey === 'selfie' && (
          <UploadStep
            title="Take a selfie"
            sub="This confirms the ID belongs to you."
            uploading={uploading === 'selfie'}
            uploaded={documents.selfie}
            previewUrl={previews.selfie}
            onUpload={(file) => uploadDoc('selfie', file)}
            onRetake={() => retake('selfie')}
            onBack={goBack}
            onNext={goNext}
            forceCamera
          />
        )}

        {stepKey === 'review' && (
          <div>
            <h1>Review before you submit</h1>
            <p className={styles.sub}>Once submitted, your documents move into review.</p>
            <div className={styles.reviewCard}>
              <div className={styles.reviewRow}><span>Name</span><span>{personal.firstName} {personal.lastName}</span></div>
              <div className={styles.reviewRow}><span>Document type</span><span>{selectedIdOption?.label}</span></div>
              <div className={styles.reviewRow}><span>Front uploaded</span><span>{documents.front ? 'Yes' : 'No'}</span></div>
              {hasBack && <div className={styles.reviewRow}><span>Back uploaded</span><span>{documents.back ? 'Yes' : 'No'}</span></div>}
              <div className={styles.reviewRow}><span>Selfie uploaded</span><span>{documents.selfie ? 'Yes' : 'No'}</span></div>
            </div>
            <div className={styles.privacyNote}>
              Your documents are stored privately and reviewed only by authorized ClaimPoint staff and verification partners. They&apos;re never publicly accessible.
            </div>
            <div className={styles.navRow}>
              <button className={styles.btnGhost} onClick={goBack} type="button" disabled={submitting}>Back</button>
              <button className={styles.btnPrimary} onClick={handleSubmit} type="button" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UploadStep({ title, sub, uploading, uploaded, previewUrl, onUpload, onRetake, onBack, onNext, forceCamera }) {
  if (uploaded && previewUrl) {
    return (
      <div>
        <h1>{title}</h1>
        <p className={styles.sub}>{sub}</p>
        <div className={styles.previewWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Captured document" className={styles.previewImg} />
        </div>
        <button className={styles.retakeBtn} onClick={onRetake} type="button">Retake photo</button>
        <div className={styles.navRow}>
          <button className={styles.btnGhost} onClick={onBack} type="button">Back</button>
          <button className={styles.btnPrimary} onClick={onNext} type="button">Continue</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>{title}</h1>
      <p className={styles.sub}>{sub}</p>
      <label className={styles.uploadZone}>
        <input
          type="file"
          hidden
          accept=".jpg,.jpeg,.png,.heic"
          capture={forceCamera ? 'user' : undefined}
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          disabled={uploading}
        />
        <h4>{uploading ? 'Uploading…' : forceCamera ? 'Tap to take a selfie' : 'Tap to take a photo'}</h4>
        {!forceCamera && <p>Or upload an existing image</p>}
      </label>
      <div className={styles.navRow}>
        <button className={styles.btnGhost} onClick={onBack} type="button">Back</button>
        <button className={styles.btnPrimary} onClick={onNext} type="button" disabled>Continue</button>
      </div>
    </div>
  );
}