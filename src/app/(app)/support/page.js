import styles from './page.module.css';

export const metadata = { title: 'Support — ClaimPoint Solutions' };

const faqs = [
  { q: 'How long does a claim take to review?', a: 'Most claims move into review within a few hours, and initial review typically completes in 24 to 72 hours.' },
  { q: 'Do I need to verify my identity to file a claim?', a: 'You can start a claim before verification, but some financial actions stay limited until verification is complete.' },
  { q: 'What happens if my claim is not recovered?', a: 'If ClaimPoint is unable to recover your funds, there is no fee. You only pay if a success-based fee was disclosed and funds were actually recovered.' },
];

export default function SupportPage() {
  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Support</h1>
        <p>Use live chat in the corner for anything urgent, or browse common questions below.</p>
      </div>

      <div className={styles.faqList}>
        {faqs.map((f) => (
          <div className={styles.faqItem} key={f.q}>
            <h4>{f.q}</h4>
            <p>{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}