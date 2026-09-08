import AccountsGrid from '@/components/dashboard/AccountsGrid';
import { getAccounts } from '@/lib/data/accounts';
import styles from './page.module.css';

export const metadata = { title: 'Accounts — ClaimPoint Solutions' };

export default async function AccountsPage() {
  const { accounts, error } = await getAccounts();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Accounts</h1>
        <p>All your ClaimPoint accounts and products in one place.</p>
      </div>

      {error && (
        <div className={styles.inlineError}>
          Couldn&apos;t load your accounts right now. The rest of your dashboard is unaffected.
        </div>
      )}

      {!error && accounts.length === 0 && (
        <div className={styles.emptyState}>
          <h4>No accounts yet</h4>
          <p>Your Standard Account is created automatically when you sign up. If you don&apos;t see it, contact support.</p>
        </div>
      )}

      {!error && accounts.length > 0 && <AccountsGrid accounts={accounts} />}
    </div>
  );
}