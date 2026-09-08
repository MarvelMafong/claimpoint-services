import Hero from '@/components/marketing/Hero';
import LogoStrip from '@/components/marketing/LogoStrip';
import TwinPillars from '@/components/marketing/TwinPillars';
import HowItWorks from '@/components/marketing/HowItWorks';
import Products from '@/components/marketing/Products';
import Security from '@/components/marketing/Security';
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
      <Cta />
    </>
  );
}