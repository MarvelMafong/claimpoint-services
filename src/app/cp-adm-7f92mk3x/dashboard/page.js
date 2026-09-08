import { getOverviewStats, getClaimsForAdmin } from '@/lib/data/admin';
import styles from './page.module.css';

export const metadata = { title: 'Admin Dashboard — ClaimPoint Solutions' };

export default async function AdminDashboardPage() {
  const stats = await getOverviewStats();
  const { claims } = await getClaimsForAdmin();
  const needsAttention = claims
    .filter((c) => !['recovered', 'not_recovered', 'closed'].includes(c.status))
    .slice(0, 5);

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Dashboard</h1>
        <p>An overview of what needs attention today.</p>
      </div>

      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Open claims</div>
          <div className={styles.kpiValue}>{stats.openClaims}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Pending verifications</div>
          <div className={styles.kpiValue}>{stats.pendingVerifications}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Recovery rate</div>
          <div className={styles.kpiValue}>{stats.recoveryRate}%</div>
        </div>
      </div>

      <div className={styles.sectionHead}>
        <h2>Needs attention</h2>
      </div>

      {needsAttention.length === 0 ? (
        <div className={styles.emptyState}>Nothing needs attention right now.</div>
      ) : (
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.head}`}>
            <span>Customer</span><span>Category</span><span>Status</span><span>Amount</span>
          </div>
          {needsAttention.map((c) => (
            <div className={styles.row} key={c.id}>
              <span>{c.profiles?.first_name} {c.profiles?.last_name}<br /><span className={styles.ref}>{c.reference}</span></span>
              <span>{c.category}</span>
              <span>{c.status}</span>
              <span>{c.amount ? `$${Number(c.amount).toLocaleString()}` : '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}