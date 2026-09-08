import { getOpenConversations } from '@/lib/data/admin-extra';
import AdminChatWorkspace from '@/components/admin/AdminChatWorkspace';

export const metadata = { title: 'Live Chat — Admin — ClaimPoint Solutions' };

export default async function AdminChatPage() {
  const { conversations } = await getOpenConversations();

  return <AdminChatWorkspace initialConversations={conversations} />;
}