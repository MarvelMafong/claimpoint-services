import Link from 'next/link';
import styles from '../marketing-page.module.css';

export const metadata = { title: 'Banking — ClaimPoint Solutions' };

export default function BankingPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>A real account for real money movement</h1>
        <p>Deposits, withdrawals, transfers, and savings products, backed by licensed financial infrastructure and a clear, auditable ledger.</p>
      </div>

      <div className={styles.section}>
        <h2>Standard Account</h2>
        <p>Your core ClaimPoint account. Hold funds, receive recovered money, and move it whenever you need to.</p>

        <h2>Deposits, withdrawals, transfers</h2>
        <p>Move money in and out, or between your own ClaimPoint accounts, with every transaction receipted and traceable.</p>

        <h2>Savings &amp; term deposits</h2>
        <p>
          Set money aside with a rate that rewards patience, or lock in a fixed term for a guaranteed rate. See current
          products on the <Link href="/savings">Savings &amp; CDs</Link> page.
        </p>

        <h2>Security</h2>
        <p>Every account action is logged and auditable. Read more on the <Link href="/security">Security</Link> page.</p>
      </div>
    </div>
  );
}