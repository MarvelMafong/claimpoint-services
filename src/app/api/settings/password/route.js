import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { deliverEmail } from '@/lib/email/deliver';
import { emailTemplates } from '@/lib/email/templates';

export async function POST(request) {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Both current and new password are required.' }, { status: 400 });
  }
  const rawCurrent = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const currentPassword = rawCurrent.trim();
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword.trim() : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both current and new password are required.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  // Re-authenticate with the current password before allowing a change —
  // updateUser() alone doesn't verify the old password, so without this
  // check anyone with an active session could change the password with no
  // proof they know the current one.
  let { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError && rawCurrent !== currentPassword) {
    ({ error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: rawCurrent,
    }));
  }

  if (reauthError) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

  if (updateError) {
    console.error('Password update error:', updateError.message);
    return NextResponse.json({ error: 'Could not update your password. Please try again.' }, { status: 500 });
  }

  // the notifications system's email layer is connected.

  const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single();
  if (user.email) {
    const { subject, html } = emailTemplates.passwordChanged(profile?.first_name ?? 'there');
    await deliverEmail({ userId: user.id, to: user.email, category: 'security', subject, html });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}