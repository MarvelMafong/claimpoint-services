import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getClaimDetail } from '@/lib/data/admin';

export async function GET(request, { params }) {
  await requireAdmin();
  const { id } = await params;

  const { claim, evidence, internalReview, error } = await getClaimDetail(id);

  if (error || !claim) {
    return NextResponse.json({ error: error ?? 'Claim not found' }, { status: 404 });
  }

  return NextResponse.json({ claim, evidence, internalReview }, { status: 200 });
}