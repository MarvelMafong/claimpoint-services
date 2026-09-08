import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { getClaims } from '@/lib/data/claims';
import styles from './page.module.css';

export const metadata = { title: 'My Claims — ClaimPoint Solutions' };

export default async function ClaimsListPage() {
  const { claims } = await getClaims();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>My Claims</h1>
        <p>Every recovery claim you&apos;ve filed, and where it stands.</p>
      </div>

      {claims.length === 0 ? (
        <div className={styles.emptyState}>
          <h4>No claims filed yet</h4>
          <p>If you&apos;ve lost money to fraud or a scam, we can help you pursue recovery.</p>
          <Link href="/claims/new" className={styles.emptyBtn}>Start a claim</Link>
        </div>
      ) : (
        <>
          <div className={styles.actionsRow}>
            <Link href="/claims/new" className={styles.newBtn}>Start a new claim</Link>
          </div>
          <div className={styles.list}>
            {claims.map((claim) => (
              <Link href={`/claims/${claim.id}`} className={styles.claimRow} key={claim.id}>
                <div>
                  <div className={styles.claimCategory}>{claim.category.replace(/_/g, ' ')}</div>
                  <div className={styles.claimRef}>{claim.reference}</div>
                </div>
                <div className={styles.claimAmount}>
                  {claim.amount ? `$${Number(claim.amount).toLocaleString()}` : '—'}
                </div>
                <StatusBadge status={claim.status} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}