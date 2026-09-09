import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function PATCH(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const supabase = getSupabaseServiceClient();

  const updates = {};
  if (body.isPublished !== undefined) updates.is_published = body.isPublished;
  if (body.displayOrder !== undefined) updates.display_order = body.displayOrder;
  if (body.name !== undefined) updates.name = body.name;

  const { data: partner, error } = await supabase
    .from('partners')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Could not update partner.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'update_partner',
    entity_type: 'partner',
    entity_id: id,
    new_value: updates,
  });

  return NextResponse.json({ partner }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const { user: admin } = await requireAdmin();
  const { id } = await params;
  const supabase = getSupabaseServiceClient();

  const { data: partner } = await supabase.from('partners').select('logo_path').eq('id', id).single();

  const { error } = await supabase.from('partners').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Could not delete partner.' }, { status: 500 });
  }

  if (partner?.logo_path) {
    await supabase.storage.from('partner-logos').remove([partner.logo_path]);
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'delete_partner',
    entity_type: 'partner',
    entity_id: id,
  });

  return NextResponse.json({ success: true }, { status: 200 });
}