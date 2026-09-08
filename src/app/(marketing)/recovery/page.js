import Link from 'next/link';
import styles from '../marketing-page.module.css';

export const metadata = { title: 'Recovery & Claims — ClaimPoint Solutions' };

export default function RecoveryPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Lost money to fraud? We can help you pursue it back</h1>
        <p>File a claim and we&apos;ll guide the case, request the right evidence, and pursue it through the appropriate channels.</p>
      </div>

      <div className={styles.section}>
        <h2>What we handle</h2>
        <p>Unauthorized transactions, merchant disputes, crypto losses, romance and impersonation scams, and investment-related losses, each with questions specific to that situation.</p>

        <h2>How it works</h2>
        <p>
          Submit your claim, upload supporting evidence, and track a transparent status timeline from submission through resolution.
          See the full breakdown on the <Link href="/how-it-works">How It Works</Link> page.
        </p>

        <h2>Fees</h2>
        <p>No fee unless we recover funds. Where a success-based fee applies, you&apos;ll see the exact terms before agreeing to proceed — never charged upfront.</p>

        <h2>Getting started</h2>
        <p>
          <Link href="/signup">Create an account</Link> to start a claim, or <Link href="/login">log in</Link> if you already have one.
        </p>
      </div>
    </div>
  );
}