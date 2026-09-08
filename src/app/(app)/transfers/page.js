import MoneyForm from '@/components/money/MoneyForm';
import { getAccounts } from '@/lib/data/accounts';
import styles from '../money-page.module.css';

export const metadata = { title: 'Transfer — ClaimPoint Solutions' };

export default async function TransfersPage() {
  const { accounts } = await getAccounts();

  return (
    <div className={styles.content}>
      <MoneyForm kind="transfer" accounts={accounts} />
    </div>
  );
}