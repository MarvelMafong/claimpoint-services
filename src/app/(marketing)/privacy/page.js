import styles from '../marketing-page.module.css';

export const metadata = { title: 'Privacy Policy - ClaimPoint Solutions' };

export default function PrivacyPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Privacy Policy</h1>
        <p>Last updated: October 27, 2026</p>
      </div>
      <div className={styles.section}>
        <h2>1. What we collect</h2>
        <p>Identity: name, date of birth, nationality, government ID, selfie.</p>
        <p>Contact: email, phone, address.</p>
        <p>Claim and financial details: receipts, statements, wallet addresses, merchant names, messages with the scammer, police reports, amount lost. We never ask for seed phrases, private keys or bank passwords.</p>
        <p>Device and log data: IP address, device, browser, login times.</p>
        <p>Messages you send to support.</p>

        <h2>2. Why we collect it</h2>
        <p>To verify your identity, assess and pursue your claim, provide banking services, prevent fraud, follow the law, and improve the platform.</p>

        <h2>3. Who we share it with</h2>
        <p>Licensed banking and payment partners, identity-verification and hosting providers under contract, and authorities when the law requires it or you agree to it for your recovery. We do not sell your data or share it with marketers.</p>

        <h2>4. How long we keep it</h2>
        <p>Identity and claim records: 5 years after your account closes, as financial law requires. Device logs: 12 months. You can request deletion once those periods end.</p>

        <h2>5. Security</h2>
        <p>We use encryption, access controls and security monitoring. Two-factor authentication is coming soon.</p>

        <h2>6. Cookies</h2>
        <p>We use essential cookies for login and security. We do not use advertising cookies.</p>

        <h2>7. Your rights</h2>
        <p>You can ask to see, correct, delete, restrict or export your data. Email claimpoint.services@gmail.com. We reply within 30 days.</p>

        <h2>8. Children</h2>
        <p>18+ only. We do not knowingly collect data from children.</p>

        <h2>9. Contact</h2>
        <p>claimpoint.services@gmail.com, +1 (806) 414-0256.</p>

        <h2>10. Email and SMS messages</h2>
        <p>We send transaction emails (deposits, withdrawals, transfers), claim updates (status changes on your recovery claims), security alerts (password changes, new logins) and product updates (new features and occasional announcements). SMS messages are coming soon.</p>
      </div>
    </div>
  );
}
