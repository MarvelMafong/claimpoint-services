import styles from '../marketing-page.module.css';

export const metadata = { title: 'Terms of Service - ClaimPoint Solutions' };

export default function TermsPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Terms of Service</h1>
        <p>Last updated: October 27, 2026</p>
      </div>
      <div className={styles.section}>
        <h2>1. Who we are</h2>
        <p>ClaimPoint Solutions (&quot;ClaimPoint&quot;, &quot;we&quot;, &quot;us&quot;) is a global company based in the United States. We help people recover money lost to fraud, scams and unauthorized transactions, and we offer banking services. ClaimPoint Solutions is licensed to offer its services and works with licensed banking and payment partners. We are not a law firm. Contact: claimpoint.services@gmail.com, +1 (806) 414-0256.</p>

        <h2>2. Who can use the service</h2>
        <p>You must be at least 18 and able to enter a contract where you live. You may not use the service from a country under US, UK or EU sanctions. One account per person. Business accounts need extra verification.</p>

        <h2>3. Your account and security</h2>
        <p>Keep your login details safe and tell us at once if someone uses your account without permission. Give us accurate information and keep your identity documents up to date. We may ask for more verification at any time. Two-factor authentication is coming soon.</p>

        <h2>4. Fees, deposits, withdrawals and lock periods</h2>
        <p>Recovery fee: our fee is 30% of the amount recovered, shown in your claim agreement before we start. If we recover nothing, you pay no recovery fee.</p>
        <p>Banking fees: deposit, withdrawal and transfer fees are shown in your account before you confirm.</p>
        <p>Deposits are credited after confirmation. Withdrawals go only to verified accounts in your own name.</p>
        <p>Savings products may have a lock period shown before you choose them. Early withdrawal terms are shown with each product.</p>
        <p>If a deposit, withdrawal or transfer shows as pending for longer than expected, contact our support team at claimpoint.services@gmail.com or +1 (806) 414-0256. Our admin team will check it and tell you the status.</p>

        <h2>5. What recovery does and does not guarantee</h2>
        <p>We guide your claim, gather evidence and pursue banks, payment processors and legal channels. We do not guarantee recovery. We cannot reverse blockchain transactions, hack wallets or force a bank to return money. Success depends on third parties, speed and evidence. We will keep you updated on every claim.</p>

        <h2>6. Prohibited use</h2>
        <p>No fraud, money laundering, terrorist financing, tax evasion, false evidence, or claims for money you are not entitled to. We run identity and anti-money-laundering checks.</p>

        <h2>7. Suspension and closing</h2>
        <p>We may suspend or close an account for breaking these Terms, failing checks, giving false information, or creating a security risk. We will tell you why where the law allows. You may close your account at any time if no claim or locked product is active.</p>

        <h2>8. Liability</h2>
        <p>To the extent the law allows, our liability is limited to the fees you paid us in the 12 months before the claim. We are not responsible for delays or losses caused by third-party banks, exchanges or authorities. Nothing limits liability for gross negligence or willful misconduct.</p>

        <h2>9. Disputes and governing law</h2>
        <p>These Terms are governed by the laws of the State of Delaware, United States, unless your local consumer law requires otherwise. Please contact us first at claimpoint.services@gmail.com. We will try to settle the matter informally for 30 days before any formal process.</p>

        <h2>10. Changes</h2>
        <p>We may update these Terms. We will post the new date, and tell you about material changes by email or in the app 14 days before they apply. Continued use means you accept them.</p>
      </div>
    </div>
  );
}
