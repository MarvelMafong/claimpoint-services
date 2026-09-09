'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import formStyles from './AdminForm.module.css';
import styles from './PartnersManager.module.css';

export default function PartnersManager({ initialPartners }) {
  const router = useRouter();
  const [partners, setPartners] = useState(initialPartners);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!name || !logoFile) {
      setError('Partner name and logo are required.');
      return;
    }
    setSaving(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('logo', logoFile);

    const res = await fetch('/api/admin/partners', { method: 'POST', body: formData });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? 'Something went wrong.');
      setSaving(false);
      return;
    }

    // Previously relied only on router.refresh() to update the list —
    // that refetches the server component, but a client component's own
    // useState doesn't automatically pick up new props from that, so
    // the list stayed empty even though the save genuinely succeeded.
    setPartners((prev) => [...prev, {
      ...json.partner,
      logoUrl: `https://ldmbyjjkwadvqvakddqq.supabase.co/storage/v1/object/public/partner-logos/${json.partner.logo_path}`,
    }]);
    router.refresh();
    setName('');
    setLogoFile(null);
    setLogoPreview(null);
    setShowForm(false);
    setSaving(false);
  }

  async function togglePublish(id, current) {
    const res = await fetch(`/api/admin/partners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !current }),
    });
    if (res.ok) {
      setPartners((prev) => prev.map((p) => (p.id === id ? { ...p, is_published: !current } : p)));
      router.refresh();
    }
  }

  async function remove(id, name) {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setPartners((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    }
  }

  return (
    <div>
      <div className={styles.grid}>
        {partners.length === 0 && <p className={styles.muted}>No partners added yet.</p>}
        {partners.map((p) => (
          <div className={styles.card} key={p.id}>
            <div className={styles.logoBox}>
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoUrl} alt={p.name} className={styles.logoImg} />
              ) : (
                <span className={styles.muted}>No preview</span>
              )}
            </div>
            <div className={styles.name}>{p.name}</div>
            <span className={p.is_published ? styles.published : styles.draft}>
              {p.is_published ? 'Published' : 'Draft'}
            </span>
            <div className={styles.actions}>
              <button onClick={() => togglePublish(p.id, p.is_published)} type="button" className={styles.toggleBtn}>
                {p.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button onClick={() => remove(p.id, p.name)} type="button" className={styles.removeBtn}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {!showForm ? (
        <button className={formStyles.btnPrimary} onClick={() => setShowForm(true)} type="button" style={{ marginTop: 20 }}>
          Add partner
        </button>
      ) : (
        <form className={formStyles.form} onSubmit={handleAdd} style={{ marginTop: 24 }}>
          {error && <div className={formStyles.errorMsg}>{error}</div>}
          <div className={formStyles.field}>
            <label>Partner name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
          </div>
          <div className={formStyles.field}>
            <label>Logo image</label>
            <input type="file" accept="image/*" onChange={handleFileChange} disabled={saving} />
            {logoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="" style={{ marginTop: 10, height: 48, objectFit: 'contain' }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className={formStyles.btnGhost} onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Add partner'}</button>
          </div>
        </form>
      )}
    </div>
  );
}