import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function getClaimComments(claimId) {
  const supabase = await getSupabaseServerClient();
  const { data: comments, error } = await supabase
    .from('claim_comments')
    .select('*')
    .eq('claim_id', claimId)
    .order('created_at', { ascending: true });

  if (error) return { comments: [], error: error.message };
  return { comments: comments ?? [], error: null };
}