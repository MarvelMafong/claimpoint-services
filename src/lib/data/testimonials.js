import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function getAllTestimonials() {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('getAllTestimonials error:', error.message);
    return { testimonials: [], error: error.message };
  }
  return { testimonials: data ?? [], error: null };
}

export async function getPublishedTestimonials() {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: true });

  if (error) return { testimonials: [], error: error.message };
  return { testimonials: data ?? [], error: null };
}