import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ conversation: existing }, { status: 200 });
  }

  const { data: created, error } = await supabase
    .from('chat_conversations')
    .insert({ user_id: user.id, status: 'open' })
    .select()
    .single();

  if (error) {
    console.error('Chat conversation creation error:', error.message);
    return NextResponse.json({ error: 'Could not start a conversation.' }, { status: 500 });
  }

  return NextResponse.json({ conversation: created }, { status: 201 });
}