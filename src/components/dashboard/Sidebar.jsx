'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './Sidebar.module.css';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/accounts', label: 'Accounts' },
      { href: '/activity', label: 'Activity' },
    ],
  },
  {
    label: 'Move money',
    items: [
      { href: '/deposits', label: 'Deposits' },
      { href: '/withdrawals', label: 'Withdrawals' },
      { href: '/transfers', label: 'Transfers' },
      { href: '/savings', label: 'Savings & CDs' },
      // Previously built, never linked anywhere — genuinely unreachable.
      { href: '/beneficiaries', label: 'Beneficiaries' },
    ],
  },
  {
    label: 'Recovery',
    items: [
      { href: '/claims', label: 'My Claims' },
      { href: '/verify', label: 'Verification' },
      { href: '/documents', label: 'Documents' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/notifications', label: 'Notifications' },
      { href: '/referrals', label: 'Referrals' },
      { href: '/support', label: 'Support' },
      { href: '/settings', label: 'Settings' },
    ],
  },
];

export default function Sidebar({ profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}` : '';

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Image src="/images/claimpoint-icon.jpeg" alt="ClaimPoint" width={26} height={26} className={styles.logoImg} />
        ClaimPoint
      </div>
      {navGroups.map((group) => (
        <div className={styles.navGroup} key={group.label}>
          <div className={styles.navGroupLabel}>{group.label}</div>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
      <div className={styles.sidebarFoot}>
        {profile?.verification_status !== 'verified' && (
          <div className={styles.verifyNudge}>
            <h5>Finish verifying your identity</h5>
            <p>Some actions stay limited until verification is complete.</p>
            <Link href="/verify">Continue verification →</Link>
          </div>
        )}
        <div className={styles.userRow}>
          <div className={styles.userAvatar}>{initials || '—'}</div>
          <div className={styles.userMeta}>
            <div className={styles.userName}>
              {profile ? `${profile.first_name} ${profile.last_name}` : 'Loading…'}
            </div>
          </div>
          {/* Was completely absent before — no logout existed anywhere
              on the customer side, desktop or mobile. */}
          <button onClick={handleLogout} type="button" className={styles.logoutBtn} aria-label="Log out" title="Log out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#686579" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}