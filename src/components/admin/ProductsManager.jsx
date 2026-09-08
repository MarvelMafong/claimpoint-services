'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import formStyles from './AdminForm.module.css';
import styles from './ProductsManager.module.css';

export default function ProductsManager({ initialProducts }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [productType, setProductType] = useState('savings');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [apy, setApy] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, name, description, minAmount, apy, termMonths: productType === 'term_deposit' ? termMonths : null }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong.');
        setSaving(false);
        return;
      }

      setProducts((prev) => [json.product, ...prev]);
      setShowForm(false);
      setName(''); setDescription(''); setMinAmount(''); setApy(''); setTermMonths('');
      router.refresh();
    } catch {
      setError('Something went wrong.');
    }
    setSaving(false);
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)));
      router.refresh();
    }
  }

  return (
    <div>
      <div className={styles.table}>
        <div className={`${styles.row} ${styles.head}`}>
          <span>Name</span><span>Type</span><span>APY</span><span>Min</span><span>Status</span>
        </div>
        {products.map((p) => (
          <div className={styles.row} key={p.id}>
            <span>{p.name}</span>
            <span>{p.product_type === 'savings' ? 'Savings' : `${p.term_months}mo term`}</span>
            <span>{p.apy}%</span>
            <span>${Number(p.min_amount).toLocaleString()}</span>
            <button className={p.status === 'active' ? styles.statusActive : styles.statusInactive} onClick={() => toggleStatus(p.id, p.status)} type="button">
              {p.status}
            </button>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button className={formStyles.btnPrimary} onClick={() => setShowForm(true)} type="button" style={{ marginTop: 20 }}>
          Add product
        </button>
      ) : (
        <form className={formStyles.form} onSubmit={handleAdd} style={{ marginTop: 24 }}>
          {error && <div className={formStyles.errorMsg}>{error}</div>}
          <div className={formStyles.field}>
            <label>Product type</label>
            <select value={productType} onChange={(e) => setProductType(e.target.value)} disabled={saving}>
              <option value="savings">Savings</option>
              <option value="term_deposit">Term Deposit</option>
            </select>
          </div>
          <div className={formStyles.field}>
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>
          <div className={formStyles.field}>
            <label>Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
          </div>
          <div className={formStyles.field}>
            <label>APY (%)</label>
            <input type="text" value={apy} onChange={(e) => setApy(e.target.value)} disabled={saving} />
          </div>
          <div className={formStyles.field}>
            <label>Minimum amount</label>
            <input type="text" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} disabled={saving} />
          </div>
          {productType === 'term_deposit' && (
            <div className={formStyles.field}>
              <label>Term (months)</label>
              <input type="text" value={termMonths} onChange={(e) => setTermMonths(e.target.value)} disabled={saving} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className={formStyles.btnPrimary} style={{ background: 'var(--color-white)', border: '1.5px solid var(--color-cloud)', color: 'var(--color-ink)' }} onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={saving}>{saving ? 'Adding…' : 'Add product'}</button>
          </div>
        </form>
      )}
    </div>
  );
}