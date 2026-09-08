import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request) {
  const { user: admin } = await requireAdmin();
  const body = await request.json();
  const supabase = getSupabaseServiceClient();

  const { data: product, error } = await supabase
    .from('financial_products')
    .insert({
      product_type: body.productType,
      name: body.name,
      description: body.description,
      min_amount: Number(body.minAmount) || 0,
      max_amount: body.maxAmount ? Number(body.maxAmount) : null,
      apy: Number(body.apy),
      term_months: body.termMonths ? Number(body.termMonths) : null,
      early_withdrawal_penalty: body.earlyWithdrawalPenalty || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('Product creation error:', error.message);
    return NextResponse.json({ error: 'Could not create product.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'create_product',
    entity_type: 'product',
    entity_id: product.id,
    new_value: product,
  });

  return NextResponse.json({ product }, { status: 201 });
}