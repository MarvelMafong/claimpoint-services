import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import ClaimComments from '@/components/claims/ClaimComments';
import CancelClaimButton from '@/components/claims/CancelClaimButton';
import { getClaimDetailForCustomer } from '@/lib/data/claim-detail';
import { getClaimComments } from '@/lib/data/claim-comments';
import styles from './page.module.css';

export const metadata = { title: 'Claim Detail — ClaimPoint Solutions' };

const CANCELLABLE_STATUSES = ['submitted', 'under_review'];

export default async function ClaimDetailPage({ params }) {
  const { id } = await params;
  const { claim, evidence, error } = await getClaimDetailForCustomer(id);

  if (!claim) notFound();

  const { comments } = await getClaimComments(id);

  return (
    <div className={styles.content}>
      <Link href="/claims" className={styles.backLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#686579" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back to My Claims
      </Link>

      <div className={styles.head}>
        <div>
          <h1>{claim.category.replace(/_/g, ' ')}</h1>
          <div className={styles.sub}>Case #{claim.reference} · Filed {new Date(claim.created_at).toLocaleDateString()}</div>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      <ClaimComments comments={comments} />

      <div className={styles.card}>
        <h3>Details you submitted</h3>
        {Object.entries(claim.details ?? {}).map(([key, value]) => (
          value ? (
            <div className={styles.row} key={key}>
              <span>{key}</span>
              <span>{String(value)}</span>
            </div>
          ) : null
        ))}
      </div>

      <div className={styles.card}>
        <h3>Evidence ({evidence.length})</h3>
        {evidence.length === 0 ? (
          <p className={styles.muted}>No evidence files attached.</p>
        ) : (
          evidence.map((f) => (
            <div className={styles.row} key={f.id}><span>{f.file_name}</span></div>
          ))
        )}
      </div>

      <div className={styles.feeBanner}>
        No fee unless we recover funds. If a success-based fee applies, you&apos;ll be shown the exact terms before anything is deducted.
      </div>

      {CANCELLABLE_STATUSES.includes(claim.status) && (
        <CancelClaimButton claimId={claim.id} />
      )}
    </div>
  );
}