import SettingsShell from '@/components/settings/SettingsShell';
import { getProfile } from '@/lib/data/claims';
import { getLoginHistory } from '@/lib/data/login-history';
import styles from './page.module.css';

export const metadata = { title: 'Settings — ClaimPoint Solutions' };

export default async function SettingsPage() {
  const [{ profile }, { history }] = await Promise.all([getProfile(), getLoginHistory()]);

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Settings</h1>
        <p>Manage your profile, security, and notification preferences.</p>
      </div>
      <SettingsShell profile={profile} loginHistory={history} />
    </div>
  );
}