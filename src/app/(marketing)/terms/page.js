import styles from '../marketing-page.module.css';

export const metadata = { title: 'Terms of Service — ClaimPoint Solutions' };

export default function TermsPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Terms of Service</h1>
        <p>Last updated: placeholder — replace with actual terms and effective date.</p>
      </div>
      <div className={styles.section}>
        <h2>Acceptance of terms</h2>
        <p>Placeholder content. Replace with your finalized terms of service before launch.</p>

        <h2>Account eligibility</h2>
        <p>Placeholder content.</p>

        <h2>Recovery services</h2>
        <p>Placeholder content — this section should state the success-fee model plainly and cannot guarantee recovery outcomes.</p>
      </div>
    </div>
  );
}