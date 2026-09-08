import styles from '../marketing-page.module.css';

export const metadata = { title: 'Privacy Policy — ClaimPoint Solutions' };

export default function PrivacyPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Privacy Policy</h1>
        <p>Last updated: placeholder — replace with actual policy content and effective date.</p>
      </div>
      <div className={styles.section}>
        <h2>Information we collect</h2>
        <p>Placeholder content. Replace with your finalized privacy policy before launch.</p>

        <h2>How we use your information</h2>
        <p>Placeholder content.</p>

        <h2>Your rights</h2>
        <p>Placeholder content.</p>
      </div>
    </div>
  );
}