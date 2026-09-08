import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSystemSettings } from '@/lib/data/system-settings';
import { createNotification } from '@/lib/notifications/create';

// Mock card-add flow. Only the last 4 digits and card brand ever get
// stored — never the full number or CVV. Real card numbers require a
// PCI-compliant processor (Stripe, etc.); this exists to demonstrate the
// flow, not to actually process a card, same pattern as the rest of the
// sandbox banking features.
function detectBrand(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
}

export async function POST(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const settings = await getSystemSettings();
  const { amount, accountId, cardNumber } = await request.json();
  const numericAmount = Number(String(amount).replace(/[^0-9.]/g, ''));

  if (!numericAmount || numericAmount <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });
  }
  if (!cardNumber || cardNumber.replace(/\D/g, '').length < 12) {
    return NextResponse.json({ error: 'Enter a valid card number.' }, { status: 400 });
  }
  if (!accountId) {
    return NextResponse.json({ error: 'Select an account to deposit into.' }, { status: 400 });
  }

  const digits = cardNumber.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  const brand = detectBrand(digits);
  const reference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: transaction, error: insertError } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      account_id: accountId,
      reference,
      type: 'deposit',
      status: settings.production_financial_processing ? 'processing' : 'pending',
      amount: numericAmount,
      description: `Card deposit — ${brand} ending ${last4} (test only, not a real charge)`,
      counterparty: `${brand} •••• ${last4}`,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Card deposit error:', insertError.message);
    return NextResponse.json({ error: 'Could not process this deposit. Please try again.' }, { status: 500 });
  }

  await createNotification({
    userId: user.id,
    title: 'Card deposit received',
    message: `Your deposit of $${numericAmount.toLocaleString()} via ${brand} ending ${last4} is being processed.`,
    type: 'transaction',
    relatedEntityType: 'transaction',
    relatedEntityId: transaction.id,
  });

  return NextResponse.json({ transaction, sandbox: !settings.production_financial_processing }, { status: 201 });
}