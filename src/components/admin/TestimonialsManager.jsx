'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import formStyles from './AdminForm.module.css';
import styles from './TestimonialsManager.module.css';

export default function TestimonialsManager({ initialTestimonials }) {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [quote, setQuote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!name || !quote) {
      setError('Name and quote are required.');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: name, customerLocation: location, quote, isPublished: false }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.');
      setSaving(false);
      return;
    }
    setTestimonials((prev) => [...prev, json.testimonial]);
    setName(''); setLocation(''); setQuote('');
    setShowForm(false);
    setSaving(false);
    router.refresh();
  }

  async function togglePublish(id, current) {
    const res = await fetch(`/api/admin/testimonials/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !current }),
    });
    if (res.ok) {
      setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, is_published: !current } : t)));
      router.refresh();
    }
  }

  async function remove(id, name) {
    if (!confirm(`Remove the testimonial from ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    }
  }

  return (
    <div>
      <div className={styles.list}>
        {testimonials.length === 0 && <p className={styles.muted}>No testimonials added yet.</p>}
        {testimonials.map((t) => (
          <div className={styles.card} key={t.id}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.name}>{t.customer_name}</div>
                <div className={styles.location}>{t.customer_location}</div>
              </div>
              <span className={t.is_published ? styles.published : styles.draft}>
                {t.is_published ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className={styles.quote}>&ldquo;{t.quote}&rdquo;</p>
            <div className={styles.actions}>
              <button onClick={() => togglePublish(t.id, t.is_published)} type="button" className={styles.toggleBtn}>
                {t.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button onClick={() => remove(t.id, t.customer_name)} type="button" className={styles.removeBtn}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button className={formStyles.btnPrimary} onClick={() => setShowForm(true)} type="button" style={{ marginTop: 20 }}>
          Add testimonial
        </button>
      ) : (
        <form className={formStyles.form} onSubmit={handleAdd} style={{ marginTop: 24 }}>
          {error && <div className={formStyles.errorMsg}>{error}</div>}
          <div className={formStyles.field}>
            <label>Customer name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>
          <div className={formStyles.field}>
            <label>Location</label>
            <input type="text" placeholder="e.g. London, UK" value={location} onChange={(e) => setLocation(e.target.value)} disabled={saving} />
          </div>
          <div className={formStyles.field}>
            <label>Quote</label>
            <textarea value={quote} onChange={(e) => setQuote(e.target.value)} disabled={saving} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className={formStyles.btnGhost} onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Add testimonial'}</button>
          </div>
        </form>
      )}
    </div>
  );
}