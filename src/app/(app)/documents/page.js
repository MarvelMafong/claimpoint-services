import { getCustomerDocuments } from '@/lib/data/documents';
import styles from './page.module.css';

export const metadata = { title: 'Documents — ClaimPoint Solutions' };

export default async function DocumentsPage() {
  const { documents } = await getCustomerDocuments();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Documents</h1>
        <p>Everything you&apos;ve uploaded — claim evidence and identity documents — in one place.</p>
      </div>

      {documents.length === 0 ? (
        <div className={styles.emptyState}>
          <h4>No documents yet</h4>
          <p>Files you upload during verification or when filing a claim will show up here.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {documents.map((doc) => (
            <div className={styles.row} key={`${doc.type}-${doc.id}`}>
              <div>
                <div className={styles.name}>{doc.name}</div>
                <div className={styles.sub}>{doc.type} · {new Date(doc.date).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}