import Link from 'next/link';
import styles from './Cta.module.css';

export default function Cta() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.box}>
          <h2>Whatever brought you here, you&apos;re in the right place</h2>
          <p className={styles.sub}>
            Open an account, file a claim, or both. It only takes a few minutes to get started.
          </p>
          <Link href="/signup" className={styles.btn}>Get Started</Link>
        </div>
      </div>
    </section>
  );
}