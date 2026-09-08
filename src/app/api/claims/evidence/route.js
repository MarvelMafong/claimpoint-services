import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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