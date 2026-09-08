import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(request, { params }) {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  // RLS policy on beneficiaries already restricts this to rows owned by
  // the current user, but the explicit .eq() here makes that intent
  // visible in the query itself rather than relying on RLS silently.
  const { error } = await supabase
    .from('beneficiaries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Beneficiary delete error:', error.message);
    return NextResponse.json({ error: 'Could not remove this beneficiary.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}