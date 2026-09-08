import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function PATCH(request, { params }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  await supabase.from('admin_notifications').update({ read: true }).eq('id', id);

  return NextResponse.json({ success: true }, { status: 200 });
}