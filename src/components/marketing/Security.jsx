import styles from './Security.module.css';

export default function Security() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.card}>
          <div>
            <h2>Your information and your funds, protected the same way</h2>
            <p className={styles.sub}>
              Identity documents, verification data, and financial records
              are handled with the same care regardless of which side of
              ClaimPoint you&apos;re using.
            </p>
            <ul className={styles.list}>
              <li>
                <span className={styles.icon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2l7 3v6c0 5-3.4 8.7-7 10-3.6-1.3-7-5-7-10V5l7-3z" stroke="#35D6A3" strokeWidth="1.6" />
                  </svg>
                </span>
                Bank-grade encryption on data in transit and at rest
              </li>
              <li>
                <span className={styles.icon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12a8 8 0 1116 0 8 8 0 01-16 0z" stroke="#35D6A3" strokeWidth="1.6" />
                  </svg>
                </span>
                Identity documents stored privately, never publicly accessible
              </li>
              <li>
                <span className={styles.icon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v4l3 3" stroke="#35D6A3" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                Every account action logged and auditable
              </li>
            </ul>
          </div>
          <div className={styles.visual} />
        </div>
      </div>
    </section>
  );
}