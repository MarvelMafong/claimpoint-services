import StatusBadge from '@/components/ui/StatusBadge';
import { getTransactions } from '@/lib/data/transactions';
import styles from './page.module.css';

export const metadata = { title: 'Activity — ClaimPoint Solutions' };

export default async function ActivityPage() {
  const { transactions, error } = await getTransactions();

  const formatted = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Activity</h1>
        <p>Every transaction across your accounts, with full history and receipts.</p>
      </div>

      {error && (
        <div className={styles.inlineError}>
          Couldn&apos;t load your transaction history right now. Please try again shortly.
        </div>
      )}

      <div className={styles.card}>
        {!error && transactions.length === 0 ? (
          <div className={styles.emptyState}>
            <h4>No transactions yet</h4>
            <p>Once you make a deposit, withdrawal, or transfer, it will show up here.</p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div className={styles.row} key={tx.id}>
              <div className={styles.main}>
                <div className={styles.title}>{tx.description ?? tx.type}</div>
                <div className={styles.sub}>{tx.reference}</div>
              </div>
              <StatusBadge status={tx.status} />
              <div className={styles.amount}>
                {tx.type === 'withdrawal' ? '-' : '+'}
                {formatted(tx.amount)}
              </div>
              <div className={styles.date}>
                {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}