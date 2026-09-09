'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import AdminNotificationsBell from '@/components/admin/AdminNotificationsBell';
import styles from './AdminSidebar.module.css';

const groups = [
  { label: 'Overview', items: [{ href: '/cp-adm-7f92mk3x/dashboard', label: 'Dashboard' }, { href: '/cp-adm-7f92mk3x/customers', label: 'Customers' }, { href: '/cp-adm-7f92mk3x/verification', label: 'Verification' }] },
  { label: 'Recovery', items: [{ href: '/cp-adm-7f92mk3x/claims', label: 'Claims & Recovery' }] },
  { label: 'Financial', items: [{ href: '/cp-adm-7f92mk3x/products', label: 'Products' }, { href: '/cp-adm-7f92mk3x/financial-config', label: 'Financial Config' }] },
  { label: 'Operations', items: [{ href: '/cp-adm-7f92mk3x/chat', label: 'Live Chat' }, { href: '/cp-adm-7f92mk3x/testimonials', label: 'Testimonials' }, { href: '/cp-adm-7f92mk3x/partners', label: 'Partners' }, { href: '/cp-adm-7f92mk3x/business-settings', label: 'Business Settings' }, { href: '/cp-adm-7f92mk3x/audit-log', label: 'Audit Log' }] },
];

function SidebarContent({ adminName, pathname, onNavigate, notifications }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <div className={styles.logo}>
        <Image src="/images/claimpoint-icon.jpeg" alt="ClaimPoint" width={22} height={22} className={styles.logoImg} />
        ClaimPoint
      </div>
      <div className={styles.tag}>Admin</div>

      {groups.map((group) => (
        <div className={styles.navGroup} key={group.label}>
          <div className={styles.navGroupLabel}>{group.label}</div>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      <div className={styles.userRow}>
        <div className={styles.avatar}>{adminName?.[0] ?? 'A'}</div>
        <div style={{ flex: 1 }}>
          <div className={styles.name}>{adminName ?? 'Administrator'}</div>
          <div className={styles.role}>Administrator</div>
        </div>
        <AdminNotificationsBell initialNotifications={notifications ?? []} />
        <button onClick={handleLogout} type="button" className={styles.logoutBtn} aria-label="Log out" title="Log out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#FCFBF8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar({ adminName, notifications }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleMobileLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <aside className={styles.sidebar}>
        <SidebarContent adminName={adminName} pathname={pathname} notifications={notifications} />
      </aside>

      <div className={styles.mobileBar}>
        <button className={styles.hamburgerBtn} onClick={() => setDrawerOpen(true)} type="button" aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 12h18M3 18h18" stroke="#FCFBF8" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        <div className={styles.mobileLogo}>
          <Image src="/images/claimpoint-icon.jpeg" alt="ClaimPoint" width={20} height={20} className={styles.logoImg} />
          ClaimPoint Admin
        </div>
        <AdminNotificationsBell initialNotifications={notifications ?? []} />
        <button className={styles.mobileLogoutBtn} onClick={handleMobileLogout} type="button" aria-label="Log out">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="#FCFBF8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <button className={styles.drawerClose} onClick={() => setDrawerOpen(false)} type="button" aria-label="Close menu">×</button>
            <SidebarContent adminName={adminName} pathname={pathname} onNavigate={() => setDrawerOpen(false)} notifications={notifications} />
          </div>
        </div>
      )}
    </>
  );
}