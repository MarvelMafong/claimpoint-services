import MoneyForm from '@/components/money/MoneyForm';
import { getAccounts } from '@/lib/data/accounts';
import { getBeneficiaries } from '@/lib/data/beneficiaries';
import styles from '../money-page.module.css';

export const metadata = { title: 'Transfer — ClaimPoint Solutions' };

export default async function TransfersPage() {
  const [{ accounts }, { beneficiaries }] = await Promise.all([getAccounts(), getBeneficiaries()]);

  return (
    <div className={styles.content}>
      <MoneyForm kind="transfer" accounts={accounts} beneficiaries={beneficiaries} />
    </div>
  );
}