import ProductCatalog from '@/components/savings/ProductCatalog';
import { getActiveProducts } from '@/lib/data/products';
import { getAccounts } from '@/lib/data/accounts';
import styles from './page.module.css';

export const metadata = { title: 'Savings & CDs — ClaimPoint Solutions' };

export default async function SavingsPage() {
  const [{ products }, { accounts }] = await Promise.all([getActiveProducts(), getAccounts()]);

  const standardAccounts = accounts.filter((a) => a.account_type === 'standard');
  const ownedProducts = accounts.filter((a) => a.account_type !== 'standard');

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Savings &amp; CDs</h1>
        <p>Put your balance to work, from everyday access to locked-in terms.</p>
      </div>

      {ownedProducts.length > 0 && (
        <div className={styles.section}>
          <h2>Your products</h2>
          <div className={styles.ownedGrid}>
            {ownedProducts.map((a) => (
              <div className={styles.ownedCard} key={a.id}>
                <h4>{a.display_name}</h4>
                <div className={styles.ownedBalance}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(a.available_balance)}
                </div>
                <div className={styles.ownedMeta}>
                  {a.apy}% APY
                  {a.maturity_date && ` · Matures ${new Date(a.maturity_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2>Available products</h2>
        <ProductCatalog products={products} fundingAccounts={standardAccounts} />
      </div>
    </div>
  );
}