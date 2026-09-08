import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Closing a Savings/CD moves its balance back to the customer's Standard
// account, then marks the product account closed. Never lets a Standard
// account itself be closed — that's the account everything else feeds
// into, and closing it would leave nowhere for the balance to go.
export async function POST(request, { params }) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const { data: account } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }
  if (account.account_type === 'standard_account') {
    return NextResponse.json({ error: 'Your Standard Account can\'t be closed.' }, { status: 400 });
  }

  const { data: standardAccount } = await supabase
    .from('accounts')
    .select('id, available_balance')
    .eq('user_id', user.id)
    .eq('account_type', 'standard_account')
    .single();

  if (!standardAccount) {
    return NextResponse.json({ error: 'Could not find your Standard Account to move funds into.' }, { status: 500 });
  }

  const balanceToMove = Number(account.available_balance);

  const { error: updateStandardError } = await supabase
    .from('accounts')
    .update({ available_balance: Number(standardAccount.available_balance) + balanceToMove })
    .eq('id', standardAccount.id);

  const { error: closeError } = await supabase
    .from('accounts')
    .update({ available_balance: 0, status: 'closed' })
    .eq('id', id);

  if (updateStandardError || closeError) {
    return NextResponse.json({ error: 'Could not close this account. Please try again.' }, { status: 500 });
  }

  const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: standardAccount.id,
    reference,
    type: 'transfer',
    status: 'completed',
    amount: balanceToMove,
    description: `${account.display_name} closed — balance moved to Standard Account`,
  });

  return NextResponse.json({ success: true, movedAmount: balanceToMove }, { status: 200 });
}