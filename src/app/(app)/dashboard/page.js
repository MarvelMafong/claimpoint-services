import Link from 'next/link';
import BalanceCard from '@/components/dashboard/BalanceCard';
import VerificationDeadlineBanner from '@/components/dashboard/VerificationDeadlineBanner';
import StatusBadge from '@/components/ui/StatusBadge';
import { getPrimaryAccount } from '@/lib/data/accounts';
import { getTransactions } from '@/lib/data/transactions';
import { getClaims, getProfile } from '@/lib/data/claims';
import styles from './page.module.css';

export const metadata = { title: 'Dashboard — ClaimPoint Solutions' };

export default async function DashboardPage() {
  const [{ account }, { transactions }, { claims }, { profile }] = await Promise.all([
    getPrimaryAccount(),
    getTransactions({ limit: 3 }),
    getClaims({ limit: 2 }),
    getProfile(),
  ]);

  const formatted = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}</h1>
        <p>Here&apos;s what&apos;s happening with your account today.</p>
      </div>

      <VerificationDeadlineBanner profile={profile} />

      <div className={styles.balanceRow}>
        <BalanceCard account={account} />
        <div className={styles.quickActions}>
          <Link href="/deposits" className={styles.qaBtn}>Deposit</Link>
          <Link href="/withdrawals" className={styles.qaBtn}>Withdraw</Link>
          <Link href="/transfers" className={styles.qaBtn}>Transfer</Link>
          <Link href="/claims/new" className={styles.qaBtn}>Start a Claim</Link>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3>Active recovery claims</h3>
          <Link href="/claims">View all</Link>
        </div>
        {claims.length === 0 ? (
          <div className={styles.emptyState}>
            <h4>No claims filed yet</h4>
            <p>If you&apos;ve lost money to fraud or a scam, we can help you pursue recovery.</p>
            <Link href="/claims/new" className={styles.emptyBtn}>Start a claim</Link>
          </div>
        ) : (
          claims.map((claim) => (
            <div className={styles.claimRow} key={claim.id}>
              <div>
                <div className={styles.claimTitle}>{claim.category}</div>
                <div className={styles.claimSub}>Case #{claim.reference}</div>
              </div>
              <StatusBadge status={claim.status} />
            </div>
          ))
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h3>Recent transactions</h3>
          <Link href="/activity">View all</Link>
        </div>
        {transactions.length === 0 ? (
          <div className={styles.emptyState}>
            <h4>No transactions yet</h4>
            <p>Once you make a deposit, withdrawal, or transfer, it will show up here.</p>
            <Link href="/deposits" className={styles.emptyBtn}>Make a deposit</Link>
          </div>
        ) : (
          transactions.map((tx) => (
            <div className={styles.txRow} key={tx.id}>
              <div>
                <div className={styles.txTitle}>{tx.description ?? tx.type}</div>
                <div className={styles.txSub}>{tx.reference}</div>
              </div>
              <div className={styles.txAmount}>
                {tx.type === 'withdrawal' ? '-' : '+'}
                {formatted(tx.amount)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}