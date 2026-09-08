import { getClaimsForAdmin } from '@/lib/data/admin';
import ClaimsWorkspace from '@/components/admin/ClaimsWorkspace';

export const metadata = { title: 'Claims & Recovery — Admin — ClaimPoint Solutions' };

export default async function AdminClaimsPage() {
  const { claims, error } = await getClaimsForAdmin();

  return <ClaimsWorkspace initialClaims={claims} loadError={error} />;
}