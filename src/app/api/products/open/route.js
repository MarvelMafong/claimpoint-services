import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request) {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { productId, amount, fromAccountId } = await request.json();
  const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''));

  if (!productId || !numericAmount || numericAmount <= 0) {
    return NextResponse.json({ error: 'Missing product or amount.' }, { status: 400 });
  }
  if (!fromAccountId) {
    return NextResponse.json({ error: 'Select an account to fund this product from.' }, { status: 400 });
  }

  const { data: product, error: productError } = await supabase
    .from('financial_products')
    .select('*')
    .eq('id', productId)
    .eq('status', 'active')
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'This product is no longer available.' }, { status: 404 });
  }

  if (numericAmount < Number(product.min_amount)) {
    return NextResponse.json(
      { error: `The minimum for this product is $${Number(product.min_amount).toLocaleString()}.` },
      { status: 400 }
    );
  }
  if (product.max_amount && numericAmount > Number(product.max_amount)) {
    return NextResponse.json(
      { error: `The maximum for this product is $${Number(product.max_amount).toLocaleString()}.` },
      { status: 400 }
    );
  }

  // Real funding-source balance check, same pattern as withdrawals —
  // never trust a client-sent balance figure.
  const { data: fromAccount } = await supabase
    .from('accounts')
    .select('available_balance, status')
    .eq('id', fromAccountId)
    .eq('user_id', user.id)
    .single();

  if (!fromAccount || fromAccount.status === 'closed' || numericAmount > Number(fromAccount.available_balance)) {
    return NextResponse.json({ error: 'This exceeds the available balance in the funding account.' }, { status: 400 });
  }

  const maturityDate = product.term_months
    ? new Date(Date.now() + product.term_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;

  // Balances are privileged: the new account is created with the service
  // client (after all checks above) so customers never need direct INSERT
  // rights on accounts, which would let them create arbitrary balances.
  const service = getSupabaseServiceClient();
  const { data: newAccount, error: insertError } = await service
    .from('accounts')
    .insert({
      user_id: user.id,
      account_type: product.product_type,
      display_name: product.name,
      available_balance: numericAmount,
      apy: product.apy,
      term_months: product.term_months,
      maturity_date: maturityDate,
      product_id: product.id,
      status: 'active',
    })
    .select()
    .single();

  if (insertError) {
    console.error('Product open error:', insertError.message);
    return NextResponse.json({ error: 'Could not open this product. Please try again.' }, { status: 500 });
  }

  // Debit the funding account — previously the new product was credited
  // without the money ever leaving the funding account. Service client
  // because customers must not be able to write balances directly; the
  // balance guard stops a concurrent request from overdrawing.
  const { data: debited, error: debitError } = await service
    .from('accounts')
    .update({ available_balance: Number(fromAccount.available_balance) - numericAmount })
    .eq('id', fromAccountId)
    .eq('user_id', user.id)
    .eq('available_balance', fromAccount.available_balance)
    .select('id');

  if (debitError || !debited?.length) {
    console.error('Product funding debit error:', debitError?.message ?? 'balance changed');
    await service.from('accounts').delete().eq('id', newAccount.id);
    return NextResponse.json({ error: 'Could not move funds from the funding account. Please try again.' }, { status: 500 });
  }

  await service.from('transactions').insert({
    user_id: user.id,
    account_id: fromAccountId,
    reference: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    type: 'transfer',
    status: 'completed',
    amount: numericAmount,
    description: `Opened ${product.name}`,
  });

  return NextResponse.json({ account: newAccount }, { status: 201 });
}