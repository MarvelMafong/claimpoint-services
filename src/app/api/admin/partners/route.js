import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request) {
  const { user: admin } = await requireAdmin();
  const formData = await request.formData();
  const name = formData.get('name');
  const logo = formData.get('logo');

  if (!name || !logo || logo.size === 0) {
    return NextResponse.json({ error: 'Partner name and logo image are required.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const ext = logo.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await logo.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('partner-logos')
    .upload(path, buffer, { contentType: logo.type });

  if (uploadError) {
    console.error('Partner logo upload error:', uploadError.message);
    return NextResponse.json({ error: 'Could not upload logo.' }, { status: 500 });
  }

  const { data: partner, error } = await supabase
    .from('partners')
    .insert({
      name,
      logo_path: path,
      is_published: false,
      created_by: admin.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Partner creation error:', error.message);
    return NextResponse.json({ error: 'Could not save partner.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'create_partner',
    entity_type: 'partner',
    entity_id: partner.id,
    new_value: { name },
  });

  return NextResponse.json({ partner }, { status: 201 });
}