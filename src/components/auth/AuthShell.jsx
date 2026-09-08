import Image from 'next/image';
import Link from 'next/link';
import styles from './AuthShell.module.css';

export default function AuthShell({ brandTitle, brandBody, brandContent, brandVariant, legalNote, children }) {
  return (
    <div className={styles.shell}>
      <div className={`${styles.brandPanel} ${brandVariant === 'signup' ? styles.signupGlow : styles.loginGlow}`}>
        <div className={styles.brandLogo}>
          <Image src="/images/claimpoint-icon.jpeg" alt="ClaimPoint" width={26} height={26} className={styles.brandLogoImg} />
          ClaimPoint
        </div>

        <div className={styles.brandMid}>
          <h2>{brandTitle}</h2>
          <p>{brandBody}</p>
          {brandContent}
        </div>

        <div className={styles.brandFoot}>{legalNote}</div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formWrap}>
          <Link href="/" className={styles.backLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#686579" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}