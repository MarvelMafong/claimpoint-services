import BeneficiariesList from '@/components/beneficiaries/BeneficiariesList';
import { getBeneficiaries } from '@/lib/data/beneficiaries';
import styles from './page.module.css';

export const metadata = { title: 'Beneficiaries — ClaimPoint Solutions' };

export default async function BeneficiariesPage() {
  const { beneficiaries } = await getBeneficiaries();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Beneficiaries</h1>
        <p>People you send money to regularly.</p>
      </div>
      <BeneficiariesList initialBeneficiaries={beneficiaries} />
    </div>
  );
}