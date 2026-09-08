import styles from './StatusBadge.module.css';

// tone maps a raw status string to a visual treatment. Extend this map as
// new statuses get added rather than hardcoding colors per usage site.
const toneMap = {
  completed: 'success',
  recovered: 'success',
  active: 'success',
  verified: 'success',
  pending: 'pending',
  processing: 'pending',
  under_review: 'review',
  investigation: 'review',
  evidence_required: 'review',
  submitted: 'review',
  failed: 'danger',
  rejected: 'danger',
  flagged: 'danger',
};

function toTone(status) {
  return toneMap[status?.toLowerCase().replace(/\s+/g, '_')] ?? 'pending';
}

function toLabel(status) {
  if (!status) return 'Unknown';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status }) {
  const tone = toTone(status);
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      <span className={styles.dot} />
      {toLabel(status)}
    </span>
  );
}