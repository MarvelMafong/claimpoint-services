'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelClaimButton({ claimId }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!confirm('Cancel this claim? This stops ClaimPoint from pursuing it further. This cannot be undone.')) return;
    setCancelling(true);
    const res = await fetch(`/api/claims/${claimId}/cancel`, { method: 'POST' });
    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json();
      alert(json.error ?? 'Could not cancel this claim.');
    }
    setCancelling(false);
  }

  return (
    <button
      onClick={handleCancel}
      disabled={cancelling}
      type="button"
      style={{
        marginTop: 20, padding: '11px 20px', borderRadius: 12,
        background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
        fontSize: 13.5, fontWeight: 600,
      }}
    >
      {cancelling ? 'Cancelling…' : 'Cancel this claim'}
    </button>
  );
}