import MoneyForm from '@/components/money/MoneyForm';
import { getAccounts } from '@/lib/data/accounts';
import { getProfile } from '@/lib/data/claims';
import styles from '../money-page.module.css';

export const metadata = { title: 'Withdraw — ClaimPoint Solutions' };

export default async function WithdrawalsPage() {
  const [{ accounts }, { profile }] = await Promise.all([getAccounts(), getProfile()]);

  return (
    <div className={styles.content}>
      <MoneyForm kind="withdrawal" accounts={accounts} verificationStatus={profile?.verification_status} />
    </div>
  );
}