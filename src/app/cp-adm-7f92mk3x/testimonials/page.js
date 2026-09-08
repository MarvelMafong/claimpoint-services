import { getAllTestimonials } from '@/lib/data/testimonials';
import TestimonialsManager from '@/components/admin/TestimonialsManager';
import styles from '../admin-page.module.css';

export const metadata = { title: 'Testimonials — Admin — ClaimPoint Solutions' };

export default async function AdminTestimonialsPage() {
  const { testimonials } = await getAllTestimonials();

  return (
    <div className={styles.content}>
      <div className={styles.pageHead}>
        <h1>Testimonials</h1>
        <p>Add real customer feedback. Only published ones appear on the public site.</p>
      </div>
      <TestimonialsManager initialTestimonials={testimonials} />
    </div>
  );
}