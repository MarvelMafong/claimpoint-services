import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB, matches the spec's upload limit
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];

export async function POST(request) {
  const supabase = await getSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds the 25MB limit' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
  }

  const path = `${user.id}/drafts/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('claim-evidence')
    .upload(path, file);

  if (uploadError) {
    console.error('Evidence upload error:', uploadError.message);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }

  const { data: evidenceRow, error: insertError } = await supabase
    .from('claim_evidence')
    .insert({
      claim_id: null, // linked to a claim once the claim itself is submitted
      user_id: user.id,
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Evidence row insert error:', insertError.message);
    return NextResponse.json({ error: 'Upload succeeded but could not be recorded.' }, { status: 500 });
  }

  return NextResponse.json({ evidence: evidenceRow }, { status: 201 });
}

// Deletes draft uploads when the customer cancels a draft. Only the
// caller's own rows that are not yet linked to a submitted claim can
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
    .from('claim_evidence')
    .select('id, storage_path')
    .in('id', ids)
    .eq('user_id', user.id)
    .is('claim_id', null);

  if (!rows?.length) {
    return NextResponse.json({ deleted: 0 }, { status: 200 });
  }

  const paths = rows.map((r) => r.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await service.storage.from('claim-evidence').remove(paths);
    if (storageError) console.error('Draft evidence storage delete error:', storageError.message);
  }

  const { error: deleteError } = await service
    .from('claim_evidence')
    .delete()
    .in('id', rows.map((r) => r.id));

  if (deleteError) {
    console.error('Draft evidence delete error:', deleteError.message);
    return NextResponse.json({ error: 'Could not delete draft files.' }, { status: 500 });
  }

  return NextResponse.json({ deleted: rows.length }, { status: 200 });
}
