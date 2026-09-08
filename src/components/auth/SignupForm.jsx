'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './AuthForm.module.css';

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    // Referral code from the URL (?ref=CODE), if the signup link came
    // from someone's referral link. Previously never captured at all —
    // the whole referral system generated codes but nothing downstream
    // ever recorded who used one.
    const referredBy = searchParams.get('ref');

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          ...(referredBy ? { referred_by: referredBy } : {}),
        },
      },
    });

    setLoading(false);

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists.');
      } else {
        setError('Something went wrong creating your account. Please try again.');
      }
      return;
    }

    router.push('/login?justRegistered=1');
    router.refresh();
  }

  async function handleGoogleSignup() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <>
      <span className={styles.eyebrow}>Get started</span>
      <h1 className={styles.heading}>Create your account</h1>
      <p className={styles.sub}>Takes about two minutes. You can verify your identity right after.</p>

      {error && (
        <div className={styles.inlineError} role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="fname">First name</label>
            <input type="text" id="fname" placeholder="First name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
          </div>
          <div className={styles.field}>
            <label htmlFor="lname">Last name</label>
            <input type="text" id="lname" placeholder="Last name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="email">Email address</label>
          <input type="email" id="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">Phone number</label>
          <input type="tel" id="phone" placeholder="(555) 000-0000" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input type="password" id="password" placeholder="Create a password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          <div className={styles.fieldHint}>At least 8 characters, one number, one symbol.</div>
        </div>
        <label className={styles.checkRowStart}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          I agree to the <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
        </label>
        <button type="submit" className={styles.btnSubmit} disabled={loading}>
          {loading ? 'Creating account\u2026' : 'Create Account'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <button type="button" className={styles.googleBtn} onClick={handleGoogleSignup} disabled={loading}>
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.4H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.3 7.4 24 12 24z"/><path fill="#FBBC05" d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.4C.5 8.3 0 10.1 0 12s.5 3.7 1.4 5.4l4-3.1z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.7l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9z"/></svg>
        Continue with Google
      </button>

      <p className={styles.formFoot}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </>
  );
}

export default function SignupForm() {
  return (
    <Suspense fallback={null}>
      <SignupFormInner />
    </Suspense>
  );
}