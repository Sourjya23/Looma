import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { HeroSection } from './components/HeroSection';
import { StatsSection } from './components/StatsSection';
import { FeaturesSection } from './components/FeaturesSection';
import { ProcessSection } from './components/ProcessSection';
import { CtaSection } from './components/CtaSection';
import { Preloader } from './components/Preloader';

export function LandingPage() {
  return (
    <>
      <Preloader />
      <Navbar />
      <main style={{ paddingTop: '80px' }}>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <ProcessSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
