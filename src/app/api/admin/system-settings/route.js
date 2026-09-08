import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function PATCH(request) {
  const { user: admin } = await requireAdmin();
  const body = await request.json();
  const supabase = getSupabaseServiceClient();

  const { data: existing } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 1)
    .single();

  // The production financial processing flag is the single most
  // consequential toggle in the app — enabling it activates real money
  // movement. It requires the exact typed phrase, both when turning it ON
  // and OFF, per the spec's explicit instruction that this must never be
  // a single accidental click either direction.
  if (body.production_financial_processing !== undefined &&
      body.production_financial_processing !== existing?.production_financial_processing) {
    const expectedPhrase = body.production_financial_processing ? 'ENABLE PRODUCTION' : 'DISABLE PRODUCTION';
    if (body.confirmationPhrase !== expectedPhrase) {
      return NextResponse.json(
        { error: `Type "${expectedPhrase}" exactly to confirm this change.` },
        { status: 400 }
      );
    }
  }

  const updates = { updated_at: new Date().toISOString(), updated_by: admin.id };
  if (body.production_financial_processing !== undefined) updates.production_financial_processing = body.production_financial_processing;
  if (body.deposits_enabled !== undefined) updates.deposits_enabled = body.deposits_enabled;
  if (body.withdrawals_enabled !== undefined) updates.withdrawals_enabled = body.withdrawals_enabled;
  if (body.transfers_enabled !== undefined) updates.transfers_enabled = body.transfers_enabled;

  const { data, error } = await supabase
    .from('system_settings')
    .update(updates)
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    console.error('System settings update error:', error.message);
    return NextResponse.json({ error: 'Could not save settings.' }, { status: 500 });
  }

  await supabase.from('audit_log').insert({
    admin_id: admin.id,
    action: 'update_system_settings',
    entity_type: 'settings',
    previous_value: existing,
    new_value: updates,
  });

  return NextResponse.json({ settings: data }, { status: 200 });
}