import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic'];

export async function POST(request) {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const docType = formData.get('docType'); // 'front' | 'back' | 'selfie'

  if (!file || !docType) {
    return NextResponse.json({ error: 'Missing file or document type' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds the 25MB limit' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Please upload a JPG, PNG, or HEIC image' }, { status: 400 });
  }

  const path = `${user.id}/drafts/${docType}-${Date.now()}`;

  const { error: uploadError } = await supabase.storage
    .from('verification-documents')
    .upload(path, file);

  if (uploadError) {
    console.error('Verification upload error:', uploadError.message);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }

  const { data: docRow, error: insertError } = await supabase
    .from('verification_documents')
    .insert({
      session_id: null, // linked once the session is submitted
      user_id: user.id,
      doc_type: docType,
      storage_path: path,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Verification document row error:', insertError.message);
    return NextResponse.json({ error: 'Upload succeeded but could not be recorded.' }, { status: 500 });
  }

  return NextResponse.json({ document: docRow }, { status: 201 });
}