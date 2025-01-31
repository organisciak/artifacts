import MeditativeFractals from '@/components/geometric/meditative-fractals';
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';
import { AlertBadge } from '@/components/ui/alert-badge';

export default function TouchSynthPage() {
  return (
    <main>
      <div className="container mx-auto px-4 py-2 space-y-2">
        <ToysNav />
        <AlertBadge message="Best on faster devices" />
      </div>
      <MeditativeFractals />
      <Footer />
    </main>
  );
}