import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function PATCH(request) {
  await requireAdmin();
  const body = await request.json();
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('site_settings')
    .update({
      company_name: body.companyName,
      support_email: body.supportEmail,
      support_phone: body.supportPhone,
      footer_legal_note: body.footerLegalNote,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    console.error('Site settings update error:', error.message);
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }

  return NextResponse.json({ settings: data }, { status: 200 });
}