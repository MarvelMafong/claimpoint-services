import { getAllPartners } from '@/lib/data/partners';
import PartnersManager from '@/components/admin/PartnersManager';
import styles from '../admin-page.module.css';

export const metadata = { title: 'Partners — Admin — ClaimPoint Solutions' };

export default async function AdminPartnersPage() {
  const { partners } = await getAllPartners();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Partners</h1>
        <p>Add real partner logos once a partnership is actually confirmed. Only published ones appear on the public site.</p>
      </div>
      <PartnersManager initialPartners={partners} />
    </div>
  );
}