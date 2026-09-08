'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/images/claimpoint-icon.jpeg"
            alt="ClaimPoint"
            width={30}
            height={30}
            className={styles.logoImg}
          />
          ClaimPoint
        </Link>

        <ul className={styles.links}>
          <li><Link href="/banking">Banking</Link></li>
          <li><Link href="/recovery">Recovery</Link></li>
          <li><Link href="/savings">Savings &amp; CDs</Link></li>
          <li><Link href="/how-it-works">How It Works</Link></li>
          <li><Link href="/security">Security</Link></li>
        </ul>

        <div className={styles.actions}>
          <Link href="/login" className={styles.btnGhost}>Log In</Link>
          <Link href="/signup" className={styles.btnPrimary}>Open an Account</Link>
        </div>
      </div>
    </header>
  );
}