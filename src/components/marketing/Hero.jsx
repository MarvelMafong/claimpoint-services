import Image from 'next/image';
import Link from 'next/link';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.grid}>
        <div>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Recovery and banking, one platform
          </span>
          <h1 className={styles.heading}>
            Get your money back.
            <br />
            Then put it <span className={styles.accent}>to work.</span>
          </h1>
          <p className={styles.sub}>
            ClaimPoint helps you pursue funds lost to fraud and scams, and
            gives you a real financial account to manage what you have and
            grow what you recover, all in one place.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/claims/new" className={styles.btnPrimary}>
              Start a Recovery Claim
            </Link>
            <Link href="/banking" className={styles.btnGhost}>
              Explore Banking →
            </Link>
          </div>
          <div className={styles.note}>No recovery, no fee, on every case we accept</div>
        </div>

        <div className={styles.visual}>
          <div className={`${styles.glow} ${styles.glow1}`} />
          <div className={`${styles.glow} ${styles.glow2}`} />
          <div className={`${styles.glow} ${styles.glow3}`} />

          <div className={styles.markCard}>
            <Image
              src="/images/claimpoint-icon.jpeg"
              alt="ClaimPoint mark"
              width={140}
              height={140}
              className={styles.markImg}
            />
          </div>

          <div className={`${styles.badge} ${styles.badge1}`}>
            <span className={`${styles.badgeDot} ${styles.mint}`} />
            Claim status: Recovered
          </div>
          <div className={`${styles.badge} ${styles.badge2}`}>
            <span className={`${styles.badgeDot} ${styles.indigo}`} />
            Balance updated
          </div>
        </div>
      </div>
    </section>
  );
}