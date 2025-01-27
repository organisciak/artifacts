import BallPhysics from '@/components/toys/ball-physics';
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';

export default function TouchSynthPage() {
  return (
    <main className="container mx-auto px-4 py-2 space-y-2">
      <ToysNav />
      <BallPhysics />
      <Footer />
    </main>
  );
}