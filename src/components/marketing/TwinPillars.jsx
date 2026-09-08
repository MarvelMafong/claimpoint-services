import Link from 'next/link';
import styles from './TwinPillars.module.css';

export default function TwinPillars() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>One account, two purposes</span>
          <h2>Whichever brought you here, both are waiting for you</h2>
          <p className={styles.sub}>
            Recovery and banking share the same account, the same login, and
            the same support team. Nothing about how you arrived limits what
            you can do next.
          </p>
        </div>

        <div className={styles.pillars}>
          <div className={`${styles.pillar} ${styles.recovery}`}>
            <div className={styles.icon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" stroke="#FF8A6B" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Recovery &amp; Claims</h3>
            <p>
              Lost money to a scam, an unauthorized transaction, or a
              merchant dispute? File a claim and we&apos;ll guide the case,
              request the right evidence, and pursue it through the
              appropriate channels.
            </p>
            <ul>
              <li>Guided intake built for your specific case type</li>
              <li>Transparent status timeline, no guessing</li>
              <li>Success based fee only, never charged upfront</li>
            </ul>
            <Link href="/claims/new" className={styles.link}>Start a claim →</Link>
          </div>

          <div className={`${styles.pillar} ${styles.banking}`}>
            <div className={styles.icon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 10h18M5 10v9h14v-9M12 3l9 7H3l9-7z" stroke="#5B4BFF" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </div>
            <h3>Banking</h3>
            <p>
              A real account for real money movement, deposits, withdrawals,
              transfers, and savings products, backed by licensed financial
              infrastructure and a clear, auditable ledger.
            </p>
            <ul>
              <li>Deposits, withdrawals, and transfers</li>
              <li>Savings and term deposit products</li>
              <li>Every transaction, receipted and traceable</li>
            </ul>
            <Link href="/signup" className={styles.link}>Open an account →</Link>
          </div>
        </div>
      </div>
    </section>
  );
}