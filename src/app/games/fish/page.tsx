import FishGame from '@/components/games/fish-game';
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';

export default function FishGamePage() {
  return (
    <main className="container mx-auto px-4 py-2 space-y-2">
      <ToysNav />
      <FishGame />
      <Footer />
    </main>
  );
}