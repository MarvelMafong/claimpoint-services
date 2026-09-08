import Link from 'next/link';
import styles from './Products.module.css';

const products = [
  { tag: 'Everyday', title: 'Standard Account', body: 'Your core ClaimPoint account. Hold funds, receive recovered money, and move it whenever you need to.', href: '/banking' },
  { tag: 'Growth', title: 'Savings', body: 'Set money aside with a rate that rewards patience, with full access when you need it.', href: '/savings' },
  { tag: 'Fixed term', title: 'Term Deposits', body: "Lock in a rate for a fixed term, from a few months to several years, and know exactly what you'll have at maturity.", href: '/savings#cds' },
];

export default function Products() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>Financial products</span>
          <h2>Put your balance to work</h2>
          <p className={styles.sub}>
            Configurable products for wherever you are, from everyday access to locked-in terms.
          </p>
        </div>

        <div className={styles.grid}>
          {products.map((p) => (
            <div className={styles.card} key={p.title}>
              <span className={styles.tag}>{p.tag}</span>
              <h4>{p.title}</h4>
              <p>{p.body}</p>
              <Link href={p.href}>Learn more →</Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}