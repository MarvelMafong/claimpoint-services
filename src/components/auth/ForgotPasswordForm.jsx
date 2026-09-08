'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './AuthForm.module.css';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Enter your email address to continue.');
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    // Always show the same success message regardless of whether the
    // email exists — never confirm or deny an account exists for a
    // given address, that's a real account-enumeration risk.
    setSent(true);
  }

  if (sent) {
    return (
      <>
        <span className={styles.eyebrow}>Check your email</span>
        <h1 className={styles.heading}>Reset link sent</h1>
        <p className={styles.sub}>
          If an account exists for {email}, a password reset link is on its way. Check your inbox and spam folder.
        </p>
        <p className={styles.formFoot}>
          <Link href="/login">Back to login</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <span className={styles.eyebrow}>Forgot your password?</span>
      <h1 className={styles.heading}>Reset your password</h1>
      <p className={styles.sub}>Enter your email and we&apos;ll send you a link to set a new one.</p>

      {error && (
        <div className={styles.inlineError} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Email address</label>
          <input
            type="email"
            id="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className={styles.formFoot}>
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}