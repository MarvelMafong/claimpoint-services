import Sidebar from '@/components/dashboard/Sidebar';
import BottomTabBar from '@/components/dashboard/BottomTabBar';
import Topbar from '@/components/layout/Topbar';
import ChatWidget from '@/components/chat/ChatWidget';
import { getProfile } from '@/lib/data/claims';
import styles from './layout.module.css';

export default async function AppLayout({ children }) {
  const { profile } = await getProfile();

  return (
    <div className={styles.shell}>
      <Sidebar profile={profile} />
      <div className={styles.mainCol}>
        <Topbar />
        <main className={styles.main}>{children}</main>
      </div>
      <BottomTabBar />
      <ChatWidget />
    </div>
  );
}