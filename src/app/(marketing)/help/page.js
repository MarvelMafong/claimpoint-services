import styles from '../marketing-page.module.css';

export const metadata = { title: 'Help Center — ClaimPoint Solutions' };

const faqs = [
  { q: 'How long does a claim take to review?', a: 'Most claims move into review within a few hours, and initial review typically completes in 24 to 72 hours.' },
  { q: 'Do I need to verify my identity to file a claim?', a: 'You can start a claim before verification, but some financial actions stay limited until verification is complete.' },
  { q: 'What happens if my claim is not recovered?', a: 'If ClaimPoint is unable to recover your funds, there is no fee. You only pay if a success-based fee was disclosed and funds were actually recovered.' },
  { q: 'Is ClaimPoint a bank?', a: 'ClaimPoint provides banking and recovery services through licensed financial partners.' },
  { q: 'How do I contact support?', a: 'Use live chat from any page once logged in, or visit the Contact page.' },
];

export default function HelpPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Help Center</h1>
        <p>Common questions about recovery, banking, and your account.</p>
      </div>

      <div className={styles.section}>
        {faqs.map((f) => (
          <div key={f.q}>
            <h2>{f.q}</h2>
            <p>{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}