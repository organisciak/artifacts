import CelestialSlide from '@/components/games/celestial-slide';
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';

export default function CelestialSlidePage() {
  return (
    <main className="container mx-auto px-4 py-2 space-y-2">
      <ToysNav />
      <CelestialSlide />
      <Footer />
    </main>
  );
}
