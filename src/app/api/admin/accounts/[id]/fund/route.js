import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { createNotification } from '@/lib/notifications/create';

// Admin-only. Adds funds directly to a customer's account balance.
// with the transaction and notification clearly identified in the resulting
// transaction and notification. Every use is logged to audit_log with
// the admin's ID, so there's a permanent record of who added what
// funds to whom and when.
export async function POST(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id: accountId } = await params;
  const { amount, availableAt } = await request.json();

  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: account, error: fetchError } = await supabase
    .from('accounts')
    .select('id, user_id, available_balance, display_name')
    .eq('id', accountId)
    .single();

  if (fetchError || !account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  const newBalance = Number(account.available_balance) + numericAmount;

  const { error: updateError } = await supabase
    .from('accounts')
    .update({
      available_balance: newBalance,
      ...(availableAt ? { funds_available_at: availableAt } : {}),
    })
    .eq('id', accountId);

  if (updateError) {
    return NextResponse.json({ error: 'Could not update account balance.' }, { status: 500 });
  }

  const reference = `CLP-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: transaction } = await supabase
    .from('transactions')
    .insert({
      user_id: account.user_id,
      account_id: accountId,
      reference,
      type: 'deposit',
      status: 'completed',
      amount: numericAmount,
      description: 'Your Account Has Been Funded',
      counterparty: `Added by admin${availableAt ? `, withdrawable from ${new Date(availableAt).toLocaleDateString()}` : ''}`,
    })
    .select()
    .single();

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'add_funds_to_customer',
    entity_type: 'account',
    entity_id: accountId,
    new_value: { amount: numericAmount, new_balance: newBalance, available_at: availableAt ?? null, reference },
  });

  await createNotification({
    userId: account.user_id,
    title: 'Your Account Has Been Funded',
    message: `${numericAmount.toLocaleString()} has been added to your account`,
    type: 'transaction',
    relatedEntityType: 'transaction',
    relatedEntityId: transaction?.id,
  });

  return NextResponse.json({ newBalance, transaction }, { status: 200 });
}






