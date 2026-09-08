import { getSiteSettings } from '@/lib/data/site-settings';
import styles from '../marketing-page.module.css';

export const metadata = { title: 'Contact — ClaimPoint Solutions' };

export default async function ContactPage() {
  const settings = await getSiteSettings();

  return (
    <div>
      <div className={styles.hero}>
        <h1>Contact</h1>
        <p>Reach out with questions about your account, a claim, or anything else.</p>
      </div>

      <div className={styles.section}>
        <h2>Support email</h2>
        <p>{settings.support_email ?? 'Contact information is being updated. Please use live chat in the meantime.'}</p>

        {settings.support_phone && (
          <>
            <h2>Support phone</h2>
            <p>{settings.support_phone}</p>
          </>
        )}

        <h2>Live chat</h2>
        <p>The fastest way to reach us is live chat, available from any page once you&apos;re logged in.</p>
      </div>
    </div>
  );
}