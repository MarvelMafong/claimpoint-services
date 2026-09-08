import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request) {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData();
  const country = formData.get('country');
  const streetAddress = formData.get('streetAddress');
  const phone = formData.get('phone');
  const photo = formData.get('photo');

  let profilePhotoUrl = null;

  // Photo is accepted at any size or dimensions — no strict limits on the
  // customer's end. It's just stored as-is; a real production version
  // would resize server-side here, but no restriction is ever shown to
  // the person uploading it.
  if (photo && photo.size > 0) {
    const ext = photo.name.split('.').pop();
    const path = `${user.id}/profile.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(path, buffer, { contentType: photo.type, upsert: true });

    if (!uploadError) {
      const { data: signed } = await supabase.storage
        .from('profile-photos')
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      profilePhotoUrl = signed?.signedUrl ?? null;
    }
  }

  const updates = { onboarding_completed: true };
  if (country) updates.country = country;
  if (streetAddress) updates.street_address = streetAddress;
  if (phone) updates.phone = phone;
  if (profilePhotoUrl) updates.profile_photo_url = profilePhotoUrl;

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Could not save your profile. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}