import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Regenerates a viewable preview URL for a document the customer already
// uploaded, in an earlier session — used specifically when resuming a
// verification draft, since the original local preview doesn't survive
// a page reload but the actual uploaded file on the server does.
export async function GET(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const documentId = request.nextUrl.searchParams.get('documentId');
  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
  }

  const { data: doc } = await supabase
    .from('verification_documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const { data: signed } = await supabase.storage
    .from('verification-documents')
    .createSignedUrl(doc.storage_path, 3600);

  return NextResponse.json({ url: signed?.signedUrl ?? null }, { status: 200 });
}