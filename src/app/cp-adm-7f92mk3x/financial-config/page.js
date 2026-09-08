import { getSystemSettings } from '@/lib/data/system-settings';
import FinancialConfigForm from '@/components/admin/FinancialConfigForm';
import styles from '../admin-page.module.css';

export const metadata = { title: 'Financial Configuration — Admin — ClaimPoint Solutions' };

export default async function FinancialConfigPage() {
  const settings = await getSystemSettings();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Financial Configuration</h1>
        <p>Controls that affect real money movement across the whole platform.</p>
      </div>
      <FinancialConfigForm settings={settings} />
    </div>
  );
}