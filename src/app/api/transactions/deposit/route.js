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
  if (!settings.deposits_enabled) {
    return NextResponse.json({ error: 'Deposits are currently unavailable.' }, { status: 403 });
  }

  const { amount, accountId, source } = await request.json();
  const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''));

  if (!numericAmount || numericAmount <= 0) {
    return NextResponse.json({ error: 'Enter a valid deposit amount.' }, { status: 400 });
  }
  if (!accountId) {
    return NextResponse.json({ error: 'Select an account to deposit into.' }, { status: 400 });
  }

  const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

  // Status is always "pending" here — never "completed". Without a real
  // production financial processor connected, no deposit can genuinely be
  // confirmed. This is a ledger-correct sandbox record, not a fake
  // balance increment. See supabase-system-settings.sql for the
  // production_financial_processing flag this depends on.
  const { data: transaction, error: insertError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: accountId,
      reference,
      type: 'deposit',
      status: settings.production_financial_processing ? 'processing' : 'pending',
      amount: numericAmount,
      description: `Deposit from ${source || 'linked source'}`,
      counterparty: source || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Deposit creation error:', insertError.message);
    return NextResponse.json({ error: 'Could not process this deposit. Please try again.' }, { status: 500 });
  }

  await createNotification({
    userId: user.id,
    title: 'Deposit received',
    message: `Your deposit of $${numericAmount.toLocaleString()} (${transaction.reference}) is being processed.`,
    type: 'transaction',
    relatedEntityType: 'transaction',
    relatedEntityId: transaction.id,
  });

  return NextResponse.json({ transaction, sandbox: !settings.production_financial_processing }, { status: 201 });
}