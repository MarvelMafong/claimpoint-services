import { getAuditLog } from '@/lib/data/admin-extra';
import styles from '../admin-page.module.css';
import tableStyles from '../table.module.css';

export const metadata = { title: 'Audit Log — Admin — ClaimPoint Solutions' };

export default async function AdminAuditLogPage() {
  const { entries } = await getAuditLog();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Audit Log</h1>
        <p>Every administrative action affecting customer or financial data.</p>
      </div>

      {entries.length === 0 ? (
        <div className={tableStyles.emptyState}>No audit entries yet.</div>
      ) : (
        <div className={tableStyles.table}>
          <div className={`${tableStyles.row} ${tableStyles.head}`}>
            <span>Action</span><span>Entity</span><span>When</span>
          </div>
          {entries.map((e) => (
            <div className={tableStyles.row} key={e.id}>
              <span>{e.action.replace(/_/g, ' ')}</span>
              <span>{e.entity_type}</span>
              <span>{new Date(e.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}