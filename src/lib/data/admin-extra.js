import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function getCustomers({ search = '' } = {}) {
  const supabase = getSupabaseServiceClient();

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getCustomers error:', error.message);
    return { customers: [], error: error.message };
  }

  return { customers: data ?? [], error: null };
}

export async function getVerificationQueue() {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('verification_sessions')
    .select('*, profiles:user_id (first_name, last_name)')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('getVerificationQueue error:', error.message);
    return { sessions: [], error: error.message };
  }

  return { sessions: data ?? [], error: null };
}

export async function getVerificationDetail(sessionId) {
  const supabase = getSupabaseServiceClient();

  const { data: session, error } = await supabase
    .from('verification_sessions')
    .select('*, profiles:user_id (first_name, last_name)')
    .eq('id', sessionId)
    .single();

  if (error) return { session: null, documents: [], internalReview: null, error: error.message };

  let { data: documents } = await supabase
    .from('verification_documents')
    .select('*')
    .eq('session_id', sessionId);

  // Sessions submitted before document linking was fixed have their files
  // stranded with session_id = null — fall back to the customer's unlinked
  // uploads so the reviewer still sees them instead of "No documents found".
  if (!documents?.length && session.user_id) {
    const { data: unlinked } = await supabase
      .from('verification_documents')
      .select('*')
      .eq('user_id', session.user_id)
      .is('session_id', null)
      .order('created_at', { ascending: false });
    documents = (unlinked ?? []).map((d) => ({ ...d, unlinked: true }));
  }

  // Signed URLs, short-lived (5 min) — the bucket is private by design, so
  // this is the only way an admin can actually view the document, and it
  // expires quickly rather than being a permanent public link.
  const documentsWithUrls = await Promise.all(
    (documents ?? []).map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(doc.storage_path, 300);
      return { ...doc, signedUrl: signed?.signedUrl ?? null };
    })
  );

  const { data: internalReview } = await supabase
    .from('verification_internal_review')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { session, documents: documentsWithUrls, internalReview, error: null };
}

export async function getAllProducts() {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('financial_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAllProducts error:', error.message);
    return { products: [], error: error.message };
  }

  return { products: data ?? [], error: null };
}

export async function getAuditLog({ limit = 50 } = {}) {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getAuditLog error:', error.message);
    return { entries: [], error: error.message };
  }

  return { entries: data ?? [], error: null };
}

export async function getOpenConversations() {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*, profiles:user_id (first_name, last_name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getOpenConversations error:', error.message);
    return { conversations: [], error: error.message };
  }

  return { conversations: data ?? [], error: null };
}