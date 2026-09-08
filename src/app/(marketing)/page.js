import Hero from '@/components/marketing/Hero';
import LogoStrip from '@/components/marketing/LogoStrip';
import TwinPillars from '@/components/marketing/TwinPillars';
import HowItWorks from '@/components/marketing/HowItWorks';
import Products from '@/components/marketing/Products';
import Security from '@/components/marketing/Security';
import Testimonials from '@/components/marketing/Testimonials';
import Partners from '@/components/marketing/Partners';
import Faq from '@/components/marketing/Faq';
import Cta from '@/components/marketing/Cta';

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoStrip />
      <TwinPillars />
      <HowItWorks />
      <Products />
      <Security />
      <Testimonials />
      <Partners />
      <Faq />
      <Cta />
    </>
  );
}