import { getPublishedPartners } from '@/lib/data/partners';
import styles from './Partners.module.css';

// Ghost placeholder slots — shown only when no real partners have been
// published yet, so the site never fabricates a relationship that
// doesn't exist. The moment even one partner is added and published in
// admin, this switches to showing the real logo automatically.
const ghostSlots = Array.from({ length: 8 }, (_, i) => i + 1);

export default async function Partners() {
  const { partners } = await getPublishedPartners();
  const hasRealPartners = partners.length > 0;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.label}>
          {hasRealPartners ? 'Working with' : 'Working toward licensed infrastructure partners'}
        </p>
      </div>
      <div className={styles.scrollTrack}>
        <div className={styles.scrollContent}>
          {hasRealPartners
            ? [...partners, ...partners].map((p, i) => (
                <div className={styles.logoSlot} key={`${p.id}-${i}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.logoUrl} alt={p.name} className={styles.realLogo} />
                </div>
              ))
            : [...ghostSlots, ...ghostSlots].map((n, i) => (
                <div className={styles.logoSlot} key={i}>
                  <span>Partner {n}</span>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}