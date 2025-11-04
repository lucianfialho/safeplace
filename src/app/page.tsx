import { HeroSection } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { Features } from '@/components/landing/features';
import { CallToAction } from '@/components/landing/call-to-action';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <HowItWorks />
      <Features />
      <CallToAction />
    </main>
  );
}
