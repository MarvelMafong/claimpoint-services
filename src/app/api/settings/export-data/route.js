import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [{ data: profile }, { data: accounts }, { data: transactions }, { data: claims }, { data: verificationSessions }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('transactions').select('*').eq('user_id', user.id),
    supabase.from('recovery_cases').select('*').eq('user_id', user.id),
    supabase.from('verification_sessions').select('id, id_type, status, submitted_at').eq('user_id', user.id),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile,
    accounts,
    transactions,
    claims,
    verificationHistory: verificationSessions,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="claimpoint-data-export.json"',
    },
  });
}