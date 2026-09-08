import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// Admin sending a reply. This was entirely missing before — the file
// only had a leftover, broken GET handler and no POST at all, so every
// send attempt from the admin side silently failed.
export async function POST(request) {
  const { user: admin } = await requireAdmin();
  const { conversationId, message } = await request.json();

  if (!conversationId || !message?.trim()) {
    return NextResponse.json({ error: 'Missing conversation or message.' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const { data: savedMessage, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'admin',
      sender_id: admin.id,
      message: message.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('Admin chat send error:', error.message);
    return NextResponse.json({ error: 'Could not send message.' }, { status: 500 });
  }

  return NextResponse.json({ message: savedMessage }, { status: 201 });
}