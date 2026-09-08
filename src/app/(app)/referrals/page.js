import ReferralCard from '@/components/referrals/ReferralCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { getReferralData } from '@/lib/data/referrals';
import styles from './page.module.css';

export const metadata = { title: 'Referrals — ClaimPoint Solutions' };

export default async function ReferralsPage() {
  const { referralCode, referrals } = await getReferralData();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Referrals</h1>
        <p>Invite people to ClaimPoint using your personal link.</p>
      </div>

      <ReferralCard referralCode={referralCode} />

      <div className={styles.section}>
        <h2>Your referrals</h2>
        {referrals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No referrals yet. Share your link above to get started.</p>
          </div>
        ) : (
          <div className={styles.table}>
            {referrals.map((r) => (
              <div className={styles.row} key={r.id}>
                <span>{r.referred_email ?? 'Pending signup'}</span>
                <StatusBadge status={r.status} />
                <span className={styles.reward}>
                  {r.reward_amount ? `$${Number(r.reward_amount).toLocaleString()}` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}