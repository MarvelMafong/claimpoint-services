import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getAdminNotifications } from '@/lib/data/admin-notifications';

export async function GET() {
  await requireAdmin();
  const { notifications } = await getAdminNotifications();
  return NextResponse.json({ notifications }, { status: 200 });
}