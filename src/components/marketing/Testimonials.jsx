import { getPublishedTestimonials } from '@/lib/data/testimonials';
import styles from './Testimonials.module.css';

export default async function Testimonials() {
  const { testimonials } = await getPublishedTestimonials();

  // No fallback content, no placeholder cards — if nothing's published
  // yet, the section simply doesn't render at all.
  if (testimonials.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>What people say</span>
          <h2>Real feedback from real customers</h2>
        </div>
        <div className={styles.grid}>
          {testimonials.map((t) => (
            <div className={styles.card} key={t.id}>
              <p className={styles.quote}>&ldquo;{t.quote}&rdquo;</p>
              <div className={styles.name}>{t.customer_name}</div>
              {t.customer_location && <div className={styles.location}>{t.customer_location}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}