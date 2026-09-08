import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// This route was previously overwritten with the conversations-route's
// content by mistake — the actual poll/send logic for customer chat
// messages never existed here at all until now.

export async function GET(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const conversationId = request.nextUrl.searchParams.get('conversationId');
  if (!conversationId) {
    return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
  }

  // Confirm this conversation actually belongs to the requesting user
  // before returning anything from it.
  const { data: conversation } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  }

  const { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Could not load messages.' }, { status: 500 });
  }

  return NextResponse.json({ messages: messages ?? [] }, { status: 200 });
}

export async function POST(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { conversationId, message } = await request.json();
  if (!conversationId || !message?.trim()) {
    return NextResponse.json({ error: 'Missing conversation or message.' }, { status: 400 });
  }

  const { data: conversation } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  }

  const { data: savedMessage, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'customer',
      sender_id: user.id,
      message: message.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('Customer chat send error:', error.message);
    return NextResponse.json({ error: 'Could not send message.' }, { status: 500 });
  }

  return NextResponse.json({ message: savedMessage }, { status: 201 });
}