import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request) {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { nickname, bankName, accountLast4 } = await request.json();

  if (!nickname) {
    return NextResponse.json({ error: 'Nickname is required.' }, { status: 400 });
  }

  const { data: beneficiary, error } = await supabase
    .from('beneficiaries')
    .insert({
      user_id: user.id,
      nickname,
      bank_name: bankName || null,
      account_last4: accountLast4 || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Beneficiary creation error:', error.message);
    return NextResponse.json({ error: 'Could not add this beneficiary. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ beneficiary }, { status: 201 });
}