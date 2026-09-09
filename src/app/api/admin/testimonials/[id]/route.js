import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function PATCH(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const supabase = getSupabaseServiceClient();

  const updates = { updated_at: new Date().toISOString() };
  if (body.customerName !== undefined) updates.customer_name = body.customerName;
  if (body.customerLocation !== undefined) updates.customer_location = body.customerLocation;
  if (body.quote !== undefined) updates.quote = body.quote;
  if (body.isPublished !== undefined) updates.is_published = body.isPublished;
  if (body.displayOrder !== undefined) updates.display_order = body.displayOrder;

  const { data: testimonial, error } = await supabase
    .from('testimonials')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Testimonial update error:', error.message);
    return NextResponse.json({ error: 'Could not update testimonial.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'update_testimonial',
    entity_type: 'testimonial',
    entity_id: id,
    new_value: updates,
  });

  return NextResponse.json({ testimonial }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.from('testimonials').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Could not delete testimonial.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'delete_testimonial',
    entity_type: 'testimonial',
    entity_id: id,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}