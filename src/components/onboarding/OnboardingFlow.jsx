'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './OnboardingFlow.module.css';

export default function OnboardingFlow() {
  const router = useRouter();
  const [country, setCountry] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    if (country) formData.append('country', country);
    if (streetAddress) formData.append('streetAddress', streetAddress);
    if (phone) formData.append('phone', phone);
    if (photo) formData.append('photo', photo);

    try {
      const res = await fetch('/api/onboarding', { method: 'POST', body: formData });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? 'Something went wrong.');
        setSubmitting(false);
        return;
      }
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  function handleSkip() {
    router.push('/dashboard');
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.eyebrow}>Almost there</div>
        <h1>Set up your profile</h1>
        <p className={styles.sub}>A couple of quick details to personalize your account. Nothing here is required to keep using ClaimPoint.</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label className={styles.photoUpload}>
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="" className={styles.photoPreview} />
            ) : (
              <div className={styles.photoPlaceholder}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke="#686579" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>Add a photo</span>
              </div>
            )}
            <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
          </label>

          <div className={styles.field}>
            <label>Country</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. United States" disabled={submitting} />
          </div>

          <div className={styles.field}>
            <label>Street address</label>
            <input type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="Optional" disabled={submitting} />
          </div>

          <div className={styles.field}>
            <label>Phone number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" disabled={submitting} />
          </div>

          <button className={styles.btnPrimary} type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Continue'}
          </button>
          <button className={styles.skipBtn} type="button" onClick={handleSkip} disabled={submitting}>
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}