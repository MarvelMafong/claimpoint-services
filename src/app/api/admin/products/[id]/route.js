import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function PATCH(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id } = await params;
  const { status } = await request.json();
  const supabase = getSupabaseServiceClient();

  const { data: product, error } = await supabase
    .from('financial_products')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Could not update product.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'update_product_status',
    entity_type: 'product',
    entity_id: id,
    new_value: { status },
  });

  return NextResponse.json({ product }, { status: 200 });
}