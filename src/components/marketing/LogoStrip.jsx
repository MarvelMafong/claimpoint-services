import styles from './LogoStrip.module.css';

export default function LogoStrip() {
  return (
    <div className={styles.strip}>
      <p className={styles.label}>Built on licensed banking and payment infrastructure</p>
    </div>
  );
}