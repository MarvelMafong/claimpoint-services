import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';

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

// Deletes draft uploads when the customer cancels a draft. Only the
// caller's own rows that are not yet linked to a submitted session can
// be removed. Service client so this doesn't depend on a DELETE policy.
export async function DELETE(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ deleted: 0 }, { status: 200 });
  }

  const service = getSupabaseServiceClient();
  const { data: rows } = await service
    .from('verification_documents')
    .select('id, storage_path')
    .in('id', ids)
    .eq('user_id', user.id)
    .is('session_id', null);

  if (!rows?.length) {
    return NextResponse.json({ deleted: 0 }, { status: 200 });
  }

  const paths = rows.map((r) => r.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await service.storage.from('verification-documents').remove(paths);
    if (storageError) console.error('Draft document storage delete error:', storageError.message);
  }

  const { error: deleteError } = await service
    .from('verification_documents')
    .delete()
    .in('id', rows.map((r) => r.id));

  if (deleteError) {
    console.error('Draft document delete error:', deleteError.message);
    return NextResponse.json({ error: 'Could not delete draft files.' }, { status: 500 });
  }

  return NextResponse.json({ deleted: rows.length }, { status: 200 });
}
