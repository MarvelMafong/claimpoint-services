import Image from 'next/image';
import Link from 'next/link';
import { getSiteSettings } from '@/lib/data/site-settings';
import styles from './Footer.module.css';

export default async function Footer() {
  const settings = await getSiteSettings();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div>
            <div className={styles.brandRow}>
              <Image
                src="/images/claimpoint-icon.jpeg"
                alt="ClaimPoint"
                width={26}
                height={26}
                className={styles.brandImg}
              />
              {settings.company_name}
            </div>
            <p className={styles.desc}>
              Recovery and banking on one platform, built on licensed financial infrastructure.
            </p>
            {(settings.support_email || settings.support_phone) && (
              <div className={styles.contactRow}>
                {settings.support_email && <div>{settings.support_email}</div>}
                {settings.support_phone && <div>{settings.support_phone}</div>}
              </div>
            )}
          </div>

          <div className={styles.col}>
            <h5>Platform</h5>
            <ul>
              <li><Link href="/banking">Banking</Link></li>
              <li><Link href="/recovery">Recovery</Link></li>
              <li><Link href="/savings">Savings &amp; CDs</Link></li>
              <li><Link href="/how-it-works">How It Works</Link></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h5>Company</h5>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/security">Security</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h5>Support</h5>
            <ul>
              <li><Link href="/help">Help Center</Link></li>
              <li><Link href="/help#chat">Live Chat</Link></li>
              <li><Link href="/help#faq">FAQ</Link></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h5>Legal</h5>
            <ul>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/disclosures">Disclosures</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} {settings.company_name}. All rights reserved.</span>
        </div>

        <p className={styles.legalNote}>{settings.footer_legal_note}</p>
      </div>
    </footer>
  );
}