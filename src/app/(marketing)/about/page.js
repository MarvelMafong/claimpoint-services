import Image from 'next/image';
import styles from '../marketing-page.module.css';

export const metadata = { title: 'About — ClaimPoint Solutions' };

export default function AboutPage() {
  return (
    <div>
      <div className={styles.hero}>
        <h1>Recovery and banking, built as one platform</h1>
        <p>
          ClaimPoint exists because people who lose money to fraud shouldn&apos;t
          have to juggle a separate recovery service and a separate bank
          account to get back on their feet.
        </p>
      </div>

      <div style={{ width: '90%', maxWidth: 900, margin: '0 auto 60px', borderRadius: 20, overflow: 'hidden' }}>
        <Image
          src="/images/about-office.jpg"
          alt=""
          width={1264}
          height={843}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      <div className={styles.section}>
        <h2>What we do</h2>
        <p>
          We help customers pursue recovery of funds lost to fraud and
          scams, and give every customer a real financial account, deposits,
          withdrawals, transfers, and savings products, on the same login.
        </p>

        <h2>How we work</h2>
        <p>
          Every recovery claim moves through a transparent status timeline.
          We never guarantee recovery, and we never charge a fee unless a
          case is successfully recovered, with the exact fee disclosed
          before you agree to proceed.
        </p>

        <h2>Security</h2>
        <p>
          Identity documents, verification data, and financial records are
          handled with the same care regardless of which side of ClaimPoint
          you&apos;re using. Read more on our <a href="/security">Security</a> page.
        </p>
      </div>
    </div>
  );
}