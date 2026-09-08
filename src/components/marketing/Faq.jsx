'use client';

import { useState } from 'react';
import styles from './Faq.module.css';

const faqs = [
  { q: 'Is ClaimPoint a real bank?', a: 'ClaimPoint provides banking and recovery services through licensed financial partners. We are not a bank ourselves, and account terms will always reflect who actually holds and moves the funds.' },
  { q: 'Do you guarantee I\u2019ll get my money back?', a: 'No. We never guarantee recovery outcomes. What we do guarantee is that you\u2019ll never pay an upfront fee, and if a success-based fee applies, you\u2019ll see the exact terms before agreeing to proceed.' },
  { q: 'How long does a claim take?', a: 'Most claims move into review within a few hours. Full resolution timelines vary by case type and the channels involved, but you can track status the whole way through.' },
  { q: 'Is my money safe while it\u2019s in my ClaimPoint account?', a: 'Funds are held through our licensed banking partners, and every account action is logged and auditable. Identity documents and financial records are stored privately, never publicly accessible.' },
  { q: 'What if I don\u2019t want to open a bank account, just file a claim?', a: 'That\u2019s fine \u2014 recovery and banking share one account, but nothing requires you to use both. You can file a claim without ever making a deposit.' },
  { q: 'How do I contact support?', a: 'Live chat is available from any page once you\u2019re logged in, or use the Contact page for other ways to reach us.' },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>Questions</span>
          <h2>Common questions</h2>
        </div>
        <div className={styles.list}>
          {faqs.map((item, i) => (
            <div className={styles.item} key={item.q}>
              <button
                className={styles.question}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                type="button"
              >
                {item.q}
                <span className={`${styles.chevron} ${openIndex === i ? styles.open : ''}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="#17152B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </button>
              {openIndex === i && <p className={styles.answer}>{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}