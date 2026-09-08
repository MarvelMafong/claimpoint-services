import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSystemSettings } from '@/lib/data/system-settings';
import { createNotification } from '@/lib/notifications/create';

export async function POST(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const settings = await getSystemSettings();
  if (!settings.withdrawals_enabled) {
    return NextResponse.json({ error: 'Withdrawals are currently unavailable.' }, { status: 403 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('verification_status')
    .eq('id', user.id)
    .single();
  if (profile?.verification_status !== 'verified') {
    return NextResponse.json(
      { error: 'Verification required before withdrawals are available.', code: 'VERIFICATION_REQUIRED' },
      { status: 403 }
    );
  }
  const { amount, accountId, destination } = await request.json();
  const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''));
  if (!numericAmount || numericAmount <= 0) {
    return NextResponse.json({ error: 'Enter a valid withdrawal amount.' }, { status: 400 });
  }
  if (!accountId) {
    return NextResponse.json({ error: 'Select an account to withdraw from.' }, { status: 400 });
  }
  const { data: account } = await supabase
    .from('accounts')
    .select('available_balance, funds_available_at')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();
  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }
  if (numericAmount > Number(account.available_balance)) {
    return NextResponse.json({ error: 'This exceeds your available balance.' }, { status: 400 });
  }
  if (account.funds_available_at && new Date(account.funds_available_at) > new Date()) {
    const availableDate = new Date(account.funds_available_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return NextResponse.json(
      { error: `Your funds are being processed and will be available for withdrawal on ${availableDate}.` },
      { status: 403 }
    );
  }
  const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  const { data: transaction, error: insertError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: accountId,
      reference,
      type: 'withdrawal',
      status: settings.production_financial_processing ? 'processing' : 'pending',
      amount: numericAmount,
      description: `Withdrawal to ${destination || 'linked destination'}`,
      counterparty: destination || null,
    })
    .select()
    .single();
  if (insertError) {
    console.error('Withdrawal creation error:', insertError.message);
    return NextResponse.json({ error: 'Could not process this withdrawal. Please try again.' }, { status: 500 });
  }
  await createNotification({
    userId: user.id,
    title: 'Withdrawal requested',
    message: `Your withdrawal of $${numericAmount.toLocaleString()} (${transaction.reference}) is being processed.`,
    type: 'transaction',
    relatedEntityType: 'transaction',
    relatedEntityId: transaction.id,
  });
  return NextResponse.json({ transaction, sandbox: !settings.production_financial_processing }, { status: 201 });
}