import Link from 'next/link';
import { getCustomers } from '@/lib/data/admin-extra';
import StatusBadge from '@/components/ui/StatusBadge';
import styles from '../admin-page.module.css';
import tableStyles from '../table.module.css';

export const metadata = { title: 'Customers — Admin — ClaimPoint Solutions' };

export default async function AdminCustomersPage() {
  const { customers } = await getCustomers();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Customers</h1>
        <p>{customers.length} total customers.</p>
      </div>
      {customers.length === 0 ? (
        <div className={tableStyles.emptyState}>No customers yet.</div>
      ) : (
        <div className={tableStyles.table}>
          <div className={`${tableStyles.row} ${tableStyles.head}`}>
            <span>Name</span><span>Verification</span><span>Joined</span>
          </div>
          {customers.map((c) => (
            <Link href={`/cp-adm-7f92mk3x/customers/${c.id}`} className={tableStyles.row} key={c.id}>
              <span>{c.first_name} {c.last_name}</span>
              <StatusBadge status={c.verification_status} />
              <span>{new Date(c.created_at).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}