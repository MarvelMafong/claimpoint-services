import MoneyForm from '@/components/money/MoneyForm';
import { getAccounts } from '@/lib/data/accounts';
import styles from '../money-page.module.css';

export const metadata = { title: 'Deposit — ClaimPoint Solutions' };

export default async function DepositsPage() {
  const { accounts } = await getAccounts();

  return (
    <div className={styles.content}>
      <MoneyForm kind="deposit" accounts={accounts} />
    </div>
  );
}