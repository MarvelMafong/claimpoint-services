import styles from '../marketing-page.module.css';

export const metadata = { title: 'Disclosures - ClaimPoint Solutions' };

export default function DisclosuresPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Disclosures</h1>
        <p>Last updated: October 27, 2026</p>
      </div>
      <div className={styles.section}>
        <h2>Fees</h2>
        <p>Recovery fee is 30% of recovered money only, shown in your claim agreement before work starts. No recovery means no recovery fee. Banking fees are shown in your account before you confirm.</p>

        <h2>Risks</h2>
        <p>Crypto and many other payments cannot be reversed.</p>
        <p>Recovery is not guaranteed and depends on third parties, evidence and time since the loss.</p>
        <p>Past results do not guarantee future results.</p>

        <h2>How funds are held</h2>
        <p>Recovered funds and deposits are held by our licensed banking and payment partners in segregated client accounts. We do not mix company funds with client funds. Every transaction is receipted and shown in your ledger.</p>

        <h2>Not legal advice</h2>
        <p>The site gives general information, not legal advice. We are not a law firm. Talk to an attorney for legal matters.</p>

        <h2>Contact</h2>
        <p>Contact: claimpoint.services@gmail.com, +1 (806) 414-0256.</p>
      </div>
    </div>
  );
}
