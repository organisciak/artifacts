import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';
import BauhausPattern from '@/components/geometric/bauhaus';

export default function BauhausPage() {
  return (
    <main>
      <div className="container mx-auto px-4 py-2 space-y-2">
        <ToysNav />
      </div>
      <BauhausPattern />
      <Footer />
    </main>
  );
}