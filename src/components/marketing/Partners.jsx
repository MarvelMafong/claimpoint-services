import styles from './Partners.module.css';

// Ghost placeholder slots — intentionally not real <Image> tags yet, since
// the actual logo files don't exist. Once partner-1.png through
// partner-8.png are added to public/images/partners/, swap the div below
// for an <Image src={`/images/partners/partner-${n}.png`} ... /> — same
// slots, same layout, nothing else changes.
const slots = Array.from({ length: 8 }, (_, i) => i + 1);

export default function Partners() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.label}>Working toward licensed infrastructure partners</p>
      </div>
      <div className={styles.scrollTrack}>
        <div className={styles.scrollContent}>
          {[...slots, ...slots].map((n, i) => (
            <div className={styles.logoSlot} key={i}>
              <span>Partner {n}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}