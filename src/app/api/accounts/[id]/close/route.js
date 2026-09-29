import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';
import { STANDARD_ACCOUNT_TYPES } from '@/lib/data/accounts';

// Closing a Savings/CD moves its balance back to the customer's Standard
// account, then marks the product account closed. Never lets a Standard
// account itself be closed — that's the account everything else feeds
// into, and closing it would leave nowhere for the balance to go.
//
// Ownership is checked with the customer's own (RLS-scoped) client, but the
// balance writes go through the service client: customers must never be
// able to write balances directly, and an RLS-blocked update would
// otherwise "succeed" while changing zero rows.
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
  if (STANDARD_ACCOUNT_TYPES.includes(account.account_type)) {
    return NextResponse.json({ error: 'Your Standard Account can\'t be closed.' }, { status: 400 });
  }
  if (account.status === 'closed') {
    return NextResponse.json({ error: 'This account is already closed.' }, { status: 400 });
  }

  const service = getSupabaseServiceClient();

  const { data: standardAccounts } = await service
    .from('accounts')
    .select('id, available_balance')
    .eq('user_id', user.id)
    .in('account_type', STANDARD_ACCOUNT_TYPES)
    .neq('status', 'closed')
    .order('created_at', { ascending: true })
    .limit(1);

  const standardAccount = standardAccounts?.[0];
  if (!standardAccount) {
    return NextResponse.json({ error: 'Could not find your Standard Account to move funds into.' }, { status: 500 });
  }

  const balanceToMove = Number(account.available_balance) || 0;

  // Close the product first, guarded on it still being open, so a double
  // click can't move the same balance twice.
  const { data: closedRows, error: closeError } = await service
    .from('accounts')
    .update({ available_balance: 0, status: 'closed' })
    .eq('id', id)
    .eq('user_id', user.id)
    .neq('status', 'closed')
    .select('id');

  if (closeError || !closedRows?.length) {
    console.error('Account close error:', closeError?.message ?? 'no rows updated');
    return NextResponse.json({ error: 'Could not close this account. Please try again.' }, { status: 500 });
  }

  const { error: updateStandardError } = await service
    .from('accounts')
    .update({ available_balance: Number(standardAccount.available_balance) + balanceToMove })
    .eq('id', standardAccount.id);

  if (updateStandardError) {
    console.error('Standard account credit error:', updateStandardError.message);
    // Roll the product back open so the balance isn't lost.
    await service
      .from('accounts')
      .update({ available_balance: balanceToMove, status: account.status ?? 'active' })
      .eq('id', id);
    return NextResponse.json({ error: 'Could not close this account. Please try again.' }, { status: 500 });
  }

  if (balanceToMove > 0) {
    const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const { error: txnError } = await service.from('transactions').insert({
      user_id: user.id,
      account_id: standardAccount.id,
      reference,
      type: 'transfer',
      status: 'completed',
      amount: balanceToMove,
      description: `${account.display_name} closed — balance moved to Standard Account`,
    });
    if (txnError) console.error('Account close transaction log error:', txnError.message);
  }

  return NextResponse.json({ success: true, movedAmount: balanceToMove }, { status: 200 });
}
