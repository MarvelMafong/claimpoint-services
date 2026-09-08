export default function VerificationDeadlineBanner({ profile }) {
  if (!profile) return null;

  if (profile.verification_status === 'submitted') {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'var(--color-lavender)', color: 'var(--color-indigo)', fontSize: 13, fontWeight: 600 }}>
        Your documents have been submitted and are under review. We&apos;ll notify you as soon as there&apos;s an update.
      </div>
    );
  }

  if (profile.verification_status === 'rejected') {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: 13, fontWeight: 600 }}>
        Your verification wasn&apos;t approved{profile.verification_rejection_reason ? `: ${profile.verification_rejection_reason}` : '.'}
        {' '}<a href="/verify" style={{ fontWeight: 700, textDecoration: 'underline' }}>Resubmit →</a>
      </div>
    );
  }

  if (profile.verification_status === 'additional_info_required') {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 20, background: 'var(--color-warn-bg)', color: 'var(--color-warn)', fontSize: 13, fontWeight: 600 }}>
        We need more information to complete your verification{profile.verification_rejection_reason ? `: ${profile.verification_rejection_reason}` : '.'}
        {' '}<a href="/verify" style={{ fontWeight: 700, textDecoration: 'underline' }}>Continue →</a>
      </div>
    );
  }

  if (profile.verification_status === 'verified') return null;

  const DEADLINE_DAYS = 7;
  const createdAt = new Date(profile.created_at);
  const deadline = new Date(createdAt.getTime() + DEADLINE_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const msRemaining = deadline - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  const isPastDeadline = msRemaining <= 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 12, marginBottom: 20,
      background: isPastDeadline ? 'var(--color-danger-bg)' : 'var(--color-warn-bg)',
      color: isPastDeadline ? 'var(--color-danger)' : 'var(--color-warn)',
      fontSize: 13, fontWeight: 600,
    }}>
      {isPastDeadline
        ? 'Verification deadline has passed — withdrawals are now limited until you verify.'
        : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining to verify before withdrawal limits apply · Deadline ${deadline.toLocaleDateString()}`}
      {' '}
      <a href="/verify" style={{ fontWeight: 700, textDecoration: 'underline' }}>Verify now →</a>
    </div>
  );
}