import { getSiteSettings } from '@/lib/data/site-settings';
import BusinessSettingsForm from '@/components/admin/BusinessSettingsForm';
import styles from '../admin-page.module.css';

export const metadata = { title: 'Business Settings — Admin — ClaimPoint Solutions' };

export default async function BusinessSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Business Settings</h1>
        <p>This information updates the public site automatically.</p>
      </div>
      <BusinessSettingsForm settings={settings} />
    </div>
  );
}