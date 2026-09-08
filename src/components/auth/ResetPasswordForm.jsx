'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './AuthForm.module.css';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    // The reset link the user clicked already established a temporary
    // session with Supabase — this just sets the new password on it.
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError('This reset link may have expired. Please request a new one.');
      return;
    }

    setDone(true);
    setTimeout(() => router.push('/login'), 2000);
  }

  if (done) {
    return (
      <>
        <span className={styles.eyebrow}>All set</span>
        <h1 className={styles.heading}>Password updated</h1>
        <p className={styles.sub}>Redirecting you to log in…</p>
      </>
    );
  }

  return (
    <>
      <span className={styles.eyebrow}>Almost done</span>
      <h1 className={styles.heading}>Set a new password</h1>
      <p className={styles.sub}>Choose a new password for your ClaimPoint account.</p>

      {error && (
        <div className={styles.inlineError} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="password">New password</label>
          <input
            type="password"
            id="password"
            placeholder="Create a new password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            type="password"
            id="confirmPassword"
            placeholder="Re-enter your new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </>
  );
}