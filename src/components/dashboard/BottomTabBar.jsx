'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './BottomTabBar.module.css';

const tabs = [
  {
    href: '/dashboard', label: 'Dashboard',
    icon: <path d="M3 10l9-7 9 7M5 9v11h14V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    href: '/accounts', label: 'Accounts',
    icon: <path d="M3 10h18M5 10v9h14v-9M12 3l9 7H3l9-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  },
  {
    href: '/activity', label: 'Activity',
    icon: <path d="M7 7h10M7 12h10M7 17h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  },
  {
    href: '/claims', label: 'Claims',
    icon: <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />,
  },
];

// Referrals and Beneficiaries were built earlier but never added here —
// genuinely unreachable on mobile until now, same gap as the desktop
// sidebar had.
const hubItems = [
  { href: '/deposits', label: 'Deposits' },
  { href: '/withdrawals', label: 'Withdrawals' },
  { href: '/transfers', label: 'Transfers' },
  { href: '/savings', label: 'Savings & CDs' },
  { href: '/beneficiaries', label: 'Beneficiaries' },
  { href: '/verify', label: 'Verification' },
  { href: '/documents', label: 'Documents' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/referrals', label: 'Referrals' },
  { href: '/support', label: 'Support' },
  { href: '/settings', label: 'Settings' },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hubOpen, setHubOpen] = useState(false);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <nav className={styles.tabbar}>
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`${styles.tabItem} ${pathname === tab.href ? styles.active : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">{tab.icon}</svg>
            {tab.label}
          </Link>
        ))}
        <button className={styles.tabItem} onClick={() => setHubOpen(true)} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
          </svg>
          Hub
        </button>
      </nav>
      <div className={`${styles.hubSheet} ${hubOpen ? styles.open : ''}`}>
        <div className={styles.hubOverlay} onClick={() => setHubOpen(false)} />
        <div className={styles.hubPanel}>
          <div className={styles.hubHandle} />
          <div className={styles.hubHead}>
            <h3>Hub</h3>
            <button className={styles.hubClose} onClick={() => setHubOpen(false)} type="button">
              ×
            </button>
          </div>
          <div className={styles.hubGrid}>
            {hubItems.map((item) => (
              <Link key={item.href} href={item.href} className={styles.hubItem} onClick={() => setHubOpen(false)}>
                {item.label}
              </Link>
            ))}
          </div>
          {/* No logout existed on mobile at all before — this Hub sheet
              was the only remaining surface to put it on. */}
          <button onClick={handleLogout} type="button" className={styles.logoutRow}>
            Log out
          </button>
        </div>
      </div>
    </>
  );
}