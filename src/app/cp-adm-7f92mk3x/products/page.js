import { getAllProducts } from '@/lib/data/admin-extra';
import ProductsManager from '@/components/admin/ProductsManager';
import styles from '../admin-page.module.css';

export const metadata = { title: 'Products — Admin — ClaimPoint Solutions' };

export default async function AdminProductsPage() {
  const { products } = await getAllProducts();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Financial Products</h1>
        <p>Savings and term deposit products available to customers.</p>
      </div>
      <ProductsManager initialProducts={products} />
    </div>
  );
}