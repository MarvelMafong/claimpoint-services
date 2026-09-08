import { getVerificationQueue } from '@/lib/data/admin-extra';
import VerificationQueue from '@/components/admin/VerificationQueue';
import styles from '../admin-page.module.css';

export const metadata = { title: 'Verification Queue — Admin — ClaimPoint Solutions' };

export default async function AdminVerificationPage() {
  const { sessions } = await getVerificationQueue();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Verification Queue</h1>
        <p>Identity verification submissions awaiting review.</p>
      </div>
      <VerificationQueue sessions={sessions} />
    </div>
  );
}