import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import VerificationFlow from '@/components/verification/VerificationFlow';

export const metadata = { title: 'Verify Your Identity — ClaimPoint Solutions' };

export default async function VerifyPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('verification_status')
    .eq('id', user.id)
    .single();

  // Already verified, or already submitted and waiting on review — the
  // upload form has no business showing again in either case.
  if (profile?.verification_status === 'verified') {
    redirect('/dashboard?verification=already-verified');
  }
  if (profile?.verification_status === 'submitted') {
    redirect('/dashboard?verification=already-submitted');
  }

  return <VerificationFlow />;
}