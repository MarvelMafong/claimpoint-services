'use client';

import { useEffect, useState } from 'react';
import styles from './SplashScreen.module.css';

// Plays once per browser session — checked via sessionStorage, not
// localStorage, so it replays on a fresh visit later but never repeats
// on every page navigation within the same visit. Renders as an overlay
// on top of the real page (which mounts normally underneath), then fades
// out and unmounts — never blocks or delays the actual app from loading.
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('claimpoint_splash_shown');
    if (alreadyShown) return;

    setVisible(true);
    sessionStorage.setItem('claimpoint_splash_shown', '1');

    const fadeTimer = setTimeout(() => setFadingOut(true), 3300);
    const removeTimer = setTimeout(() => setVisible(false), 3700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`${styles.overlay} ${fadingOut ? styles.fadeOut : ''}`}>
      <div className={styles.stage}>
        <div className={`${styles.piece} ${styles.p1}`} />
        <div className={`${styles.piece} ${styles.p2}`} />
        <div className={`${styles.piece} ${styles.p3}`} />
        <div className={styles.markCard}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/claimpoint-icon.jpeg" alt="ClaimPoint" className={styles.markImg} />
        </div>
      </div>
      <div className={styles.textWrap}>
        <div className={styles.wordmark}>ClaimPoint</div>
        <div className={styles.tagline}>Recovery and banking, one platform</div>
      </div>
    </div>
  );
}