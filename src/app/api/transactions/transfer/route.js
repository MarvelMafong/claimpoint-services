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
  if (!settings.transfers_enabled) {
    return NextResponse.json({ error: 'Transfers are currently unavailable.' }, { status: 403 });
  }

  const { amount, fromAccountId, toAccountId, transferType, externalBankName, externalAccountNumber } = await request.json();
  const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''));

  if (!numericAmount || numericAmount <= 0) {
    return NextResponse.json({ error: 'Enter a valid transfer amount.' }, { status: 400 });
  }
  if (!fromAccountId) {
    return NextResponse.json({ error: 'Select an account to transfer from.' }, { status: 400 });
  }
  if (transferType === 'internal' && (!toAccountId || fromAccountId === toAccountId)) {
    return NextResponse.json({ error: 'Select two different accounts.' }, { status: 400 });
  }
  if (transferType === 'external' && (!externalBankName || !externalAccountNumber)) {
    return NextResponse.json({ error: 'Enter the receiving bank name and account number.' }, { status: 400 });
  }

  const { data: fromAccount } = await supabase
    .from('accounts')
    .select('available_balance, display_name, funds_available_at')
    .eq('id', fromAccountId)
    .eq('user_id', user.id)
    .single();

  if (!fromAccount) {
    return NextResponse.json({ error: 'Source account not found.' }, { status: 404 });
  }
  if (numericAmount > Number(fromAccount.available_balance)) {
    return NextResponse.json({ error: 'This exceeds the available balance in that account.' }, { status: 400 });
  }
  if (fromAccount.funds_available_at && new Date(fromAccount.funds_available_at) > new Date()) {
    const availableDate = new Date(fromAccount.funds_available_at).toLocaleDateString();
    return NextResponse.json({ error: `These funds aren't available to transfer until ${availableDate}.` }, { status: 403 });
  }

  const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  const status = settings.production_financial_processing ? 'processing' : 'pending';

  const description = transferType === 'external'
    ? `Transfer to ${externalBankName} (external bank)`
    : `Transfer to ${fromAccount.display_name}`;

  const { data: transaction, error: insertError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: fromAccountId,
      reference,
      type: 'transfer',
      status,
      amount: numericAmount,
      description,
      counterparty: transferType === 'external'
        ? `${externalBankName} •••• ${externalAccountNumber.slice(-4)}`
        : toAccountId,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Transfer creation error:', insertError.message);
    return NextResponse.json({ error: 'Could not process this transfer. Please try again.' }, { status: 500 });
  }

  await createNotification({
    userId: user.id,
    title: 'Transfer sent',
    message: `Your transfer of $${numericAmount.toLocaleString()} (${transaction.reference}) is being processed.`,
    type: 'transaction',
    relatedEntityType: 'transaction',
    relatedEntityId: transaction.id,
  });

  return NextResponse.json({ transaction, sandbox: !settings.production_financial_processing }, { status: 201 });
}