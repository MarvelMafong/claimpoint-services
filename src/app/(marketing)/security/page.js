import styles from '../marketing-page.module.css';

export const metadata = { title: 'Security — ClaimPoint Solutions' };

export default function SecurityPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Your information and your funds, protected the same way</h1>
        <p>Security details for both sides of ClaimPoint, banking and recovery.</p>
      </div>

      <div className={styles.section}>
        <h2>Encryption</h2>
        <p>Data is encrypted in transit and at rest, using industry-standard protocols.</p>

        <h2>Identity documents</h2>
        <p>
          Documents you upload for verification or as claim evidence are
          stored in private storage, never publicly accessible by URL, and
          reviewed only by authorized ClaimPoint staff and verification
          partners.
        </p>

        <h2>Account access</h2>
        <ul>
          <li>Every account action is logged and auditable.</li>
          <li>Passwords are never stored in plain text.</li>
          <li>You can review and update your security settings anytime.</li>
        </ul>

        <h2>Reporting a concern</h2>
        <p>
          If you notice anything unusual on your account, contact support
          immediately through live chat or the <a href="/contact">Contact</a> page.
        </p>
      </div>
    </div>
  );
}