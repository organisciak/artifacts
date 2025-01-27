import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function ToysNav() {
  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" className="-ml-4">
        <Link href="/">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Home
        </Link>
      </Button>
    </div>
  );
} 