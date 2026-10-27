import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Hit on a schedule (cron-job.org) so the free-tier Supabase project is
// never paused for inactivity. Reads one row; exposes nothing.
export async function GET() {
  try {
    const { error } = await getSupabaseServiceClient().from('site_settings').select('id').limit(1);
    if (error) {
      console.error('keep-alive query error:', error.message);
      return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('keep-alive failed:', e?.message ?? e);
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
