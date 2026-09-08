import styles from './ClaimComments.module.css';

export default function ClaimComments({ comments }) {
  if (!comments || comments.length === 0) return null;

  return (
    <div className={styles.card}>
      <h3>Updates from ClaimPoint</h3>
      {comments.map((c) => (
        <div className={styles.comment} key={c.id}>
          <p>{c.message}</p>
          <span className={styles.date}>{new Date(c.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
      ))}
    </div>
  );
}