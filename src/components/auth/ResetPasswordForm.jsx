'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cleanPassword } from '@/lib/auth/helpers';
import styles from './AuthForm.module.css';

const EXPIRED_MESSAGE = 'This reset link may have expired. Please request a new one.';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const submittingRef = useRef(false);

  // The reset link lands here with ?code=... (PKCE). The Supabase browser
  // client exchanges it for a session on init; getSession() waits for that.
  // No session afterwards (or an error in the URL) means the link is
  // expired, already used, or was opened in a different browser.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const query = new URLSearchParams(window.location.search);
        const urlError = query.get('error') || hash.get('error');
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (urlError || !data?.session) {
          if (urlError) console.error('reset link error:', urlError, query.get('error_description') || hash.get('error_description'));
          setError(EXPIRED_MESSAGE);
        }
      } catch (err) {
        console.error('reset session check failed:', err);
        if (!cancelled) setError(EXPIRED_MESSAGE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);

    const newPassword = cleanPassword(password);
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== cleanPassword(confirmPassword)) {
      setError('Passwords do not match.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    // The reset link the user clicked already established a temporary
    // session with Supabase — this just sets the new password on it.
    const supabase = getSupabaseBrowserClient();
    let updateError = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setLoading(false);
        submittingRef.current = false;
        setError(EXPIRED_MESSAGE);
        return;
      }
      ({ error: updateError } = await supabase.auth.updateUser({ password: newPassword }));
    } catch (err) {
      updateError = err;
    }
    setLoading(false);
    submittingRef.current = false;

    if (updateError) {
      console.error('reset password update failed:', updateError.code, updateError.message);
      const code = updateError.code ?? '';
      const expired = code === 'session_not_found' || code === 'session_expired' || code === 'bad_jwt' || /session|jwt|expired/i.test(updateError.message ?? '');
      setError(expired ? EXPIRED_MESSAGE : 'Could not update your password. Please try again.');
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