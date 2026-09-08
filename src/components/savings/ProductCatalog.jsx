'use client';

import { useState } from 'react';
import OpenProductForm from './OpenProductForm';
import styles from './ProductCatalog.module.css';

export default function ProductCatalog({ products, fundingAccounts }) {
  const [selected, setSelected] = useState(null);

  if (products.length === 0) {
    return <p className={styles.emptyText}>No products are available to open right now.</p>;
  }

  return (
    <div className={styles.grid}>
      {products.map((p) => (
        <div className={styles.card} key={p.id}>
          <span className={styles.tag}>{p.product_type === 'savings' ? 'Growth' : `${p.term_months}mo`}</span>
          <h4>{p.name}</h4>
          <p>{p.description}</p>
          <div className={styles.apy}>{p.apy}% APY</div>
          <div className={styles.minAmount}>Minimum ${Number(p.min_amount).toLocaleString()}</div>
          <button className={styles.btn} onClick={() => setSelected(p)} type="button">Open account</button>
        </div>
      ))}

      {selected && (
        <OpenProductForm product={selected} fundingAccounts={fundingAccounts} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}