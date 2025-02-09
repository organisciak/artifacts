import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';
import FabricFlow from '@/components/geometric/fabric-flow';

export default function FabricFlowPage() {
  return (
    <main>
      <div className="container mx-auto px-4 py-2 space-y-2">
        <ToysNav />
      </div>
      <FabricFlow />
      <Footer />
    </main>
  );
}