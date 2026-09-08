import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function PATCH(request) {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const updates = {};

  if (body.firstName !== undefined) updates.first_name = body.firstName;
  if (body.lastName !== undefined) updates.last_name = body.lastName;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.notificationPreferences !== undefined) updates.notification_preferences = body.notificationPreferences;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Profile update error:', error.message);
    return NextResponse.json({ error: 'Could not save your changes. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ profile }, { status: 200 });
}