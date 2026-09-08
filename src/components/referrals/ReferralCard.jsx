'use client';

import { useState } from 'react';
import styles from './ReferralCard.module.css';

export default function ReferralCard({ referralCode }) {
  const [copied, setCopied] = useState(false);

  // Was hardcoded to claimpoint.com — a real, unrelated domain someone
  // else owns — instead of the actual live site. Using the real origin
  // at runtime instead, so this is correct wherever the app is actually
  // deployed (vercel.app now, the real domain later) without needing
  // another manual fix when that changes.
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://claimpoint.vercel.app';
  const link = referralCode ? `${origin}/signup?ref=${referralCode}` : null;

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable — fall back silently, the link text is
      // still visible and selectable by hand
    }
  }

  if (!referralCode) {
    return <div className={styles.card}><p>Your referral code is being generated.</p></div>;
  }

  return (
    <div className={styles.card}>
      <div className={styles.label}>Your referral link</div>
      <div className={styles.linkRow}>
        <span className={styles.link}>{link}</span>
        <button className={styles.copyBtn} onClick={handleCopy} type="button">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className={styles.codeLabel}>Or share your code: <strong>{referralCode}</strong></div>
    </div>
  );
}