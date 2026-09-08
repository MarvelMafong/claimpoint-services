'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AdminEvidenceAndComments.module.css';

export default function AdminEvidenceAndComments({ claimId, evidence, comments }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function sendComment(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    const res = await fetch(`/api/admin/claims/${claimId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (res.ok) {
      setMessage('');
      router.refresh();
    }
    setSending(false);
  }

  return (
    <div>
      <div className={styles.card}>
        <h3>Evidence ({evidence.length})</h3>
        {evidence.length === 0 ? (
          <p className={styles.muted}>No evidence files attached.</p>
        ) : (
          <div className={styles.grid}>
            {evidence.map((item) => (
              <a key={item.id} href={item.signedUrl ?? '#'} target="_blank" rel="noopener noreferrer" className={styles.evidenceCard}>
                {item.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.signedUrl} alt={item.file_name} className={styles.evidenceImg} />
                ) : (
                  <div className={styles.evidenceImgFallback}>{item.file_name}</div>
                )}
              </a>
            ))}
          </div>
        )}
        <p className={styles.linkExpiry}>Links expire in 5 minutes — reload this page to refresh them.</p>
      </div>

      <div className={styles.card}>
        <h3>Updates sent to customer ({comments.length})</h3>
        {comments.map((c) => (
          <div key={c.id} className={styles.commentRow}>
            <p>{c.message}</p>
            <span className={styles.commentDate}>{new Date(c.created_at).toLocaleString()}</span>
          </div>
        ))}
        <form onSubmit={sendComment} className={styles.form}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a follow-up the customer will see and get emailed about..."
            rows={3}
            disabled={sending}
          />
          <button type="submit" disabled={sending || !message.trim()}>{sending ? 'Sending…' : 'Send update'}</button>
        </form>
      </div>
    </div>
  );
}