import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getVerificationDetail } from '@/lib/data/admin-extra';

export async function GET(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  const { session, documents, internalReview, error } = await getVerificationDetail(id);

  if (error || !session) {
    return NextResponse.json({ error: error ?? 'Verification session not found' }, { status: 404 });
  }

  return NextResponse.json({ session, documents, internalReview }, { status: 200 });
}