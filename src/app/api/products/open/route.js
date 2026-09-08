import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request) {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { productId, amount, fromAccountId } = await request.json();
  const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''));

  if (!productId || !numericAmount) {
    return NextResponse.json({ error: 'Missing product or amount.' }, { status: 400 });
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
  if (fromAccountId) {
    const { data: fromAccount } = await supabase
      .from('accounts')
      .select('available_balance')
      .eq('id', fromAccountId)
      .eq('user_id', user.id)
      .single();

    if (!fromAccount || numericAmount > Number(fromAccount.available_balance)) {
      return NextResponse.json({ error: 'This exceeds the available balance in the funding account.' }, { status: 400 });
    }
  }

  const maturityDate = product.term_months
    ? new Date(Date.now() + product.term_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;

  const { data: newAccount, error: insertError } = await supabase
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

  return NextResponse.json({ account: newAccount }, { status: 201 });
}