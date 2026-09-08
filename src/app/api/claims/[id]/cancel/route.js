import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Customer can only cancel early — once a case is actively being worked
// (recovered, partially_recovered, not_recovered, closed), cancelling
// stops making sense and only admin controls it from there.
const CANCELLABLE_STATUSES = ['submitted', 'under_review'];

export async function POST(request, { params }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const { data: claim } = await supabase
    .from('recovery_cases')
    .select('status, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!claim) {
    return NextResponse.json({ error: 'Claim not found.' }, { status: 404 });
  }

  if (!CANCELLABLE_STATUSES.includes(claim.status)) {
    return NextResponse.json({ error: 'This claim is already being actively worked and can no longer be cancelled yourself. Contact support if you need to stop it.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('recovery_cases')
    .update({ status: 'closed' })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Could not cancel this claim. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}