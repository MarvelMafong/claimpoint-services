'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './AuthForm.module.css';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe: stayLoggedIn }),
      });
      const json = await res.json();

      setLoading(false);

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong logging you in.');
        return;
      }

      // First-time onboarding, once — everyone after that skips straight
      // to the dashboard.
      router.push(json.onboardingCompleted ? '/dashboard' : '/onboarding');
      router.refresh();
    } catch {
      setLoading(false);
      setError('Something went wrong. Please check your connection and try again.');
    }
  }

  async function handleGoogleLogin() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  }

  return (
    <>
      <span className={styles.eyebrow}>Welcome back</span>
      <h1 className={styles.heading}>Log in to ClaimPoint</h1>
      <p className={styles.sub}>Enter your details to access your account.</p>

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
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className={styles.rowBetween}>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={stayLoggedIn}
              onChange={(e) => setStayLoggedIn(e.target.checked)}
            />
            Stay logged in
          </label>
          <Link href="/forgot-password" className={styles.linkMuted}>Forgot password?</Link>
        </div>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? 'Logging in\u2026' : 'Log In'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <button type="button" className={styles.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.4H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z"/><path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.4C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.4l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.7l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9z"/></svg>
        Continue with Google
      </button>

      <p className={styles.formFoot}>
        New to ClaimPoint? <Link href="/signup">Create an account</Link>
      </p>
    </>
  );
}