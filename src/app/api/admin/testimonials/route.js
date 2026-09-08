import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request) {
  const { user: admin } = await requireAdmin();
  const body = await request.json();
  const supabase = getSupabaseServiceClient();

  if (!body.customerName || !body.quote) {
    return NextResponse.json({ error: 'Customer name and quote are required.' }, { status: 400 });
  }

  const { data: testimonial, error } = await supabase
    .from('testimonials')
    .insert({
      customer_name: body.customerName,
      customer_location: body.customerLocation || null,
      quote: body.quote,
      is_published: body.isPublished ?? false,
      display_order: body.displayOrder ?? 0,
      created_by: admin.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Testimonial creation error:', error.message);
    return NextResponse.json({ error: 'Could not save testimonial.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'create_testimonial',
    entity_type: 'testimonial',
    entity_id: testimonial.id,
    new_value: testimonial,
  });

  return NextResponse.json({ testimonial }, { status: 201 });
}