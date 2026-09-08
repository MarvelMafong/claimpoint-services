'use client';

import { useState } from 'react';
import ProfileSettings from '@/components/settings/ProfileSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import styles from './SettingsShell.module.css';

const tabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
];

export default function SettingsShell({ profile, loginHistory }) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div>
      <div className={styles.tabRow}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`${styles.tab} ${activeTab === t.id ? styles.active : ''}`}
            onClick={() => setActiveTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileSettings profile={profile} />}
      {activeTab === 'security' && <SecuritySettings loginHistory={loginHistory} />}
      {activeTab === 'notifications' && <NotificationSettings profile={profile} />}
    </div>
  );
}