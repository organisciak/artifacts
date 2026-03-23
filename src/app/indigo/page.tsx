'use client';

import dynamic from 'next/dynamic';
import ToysNav from '@/components/toys/nav';

// Dynamic import to avoid SSR issues with Three.js
const IndigoFrequency = dynamic(
  () => import('@/components/games/indigo/IndigoFrequency'),
  { ssr: false }
);

export default function IndigoPage() {
  return (
    <div className="relative w-full h-screen" style={{ background: '#0a0012' }}>
      <IndigoFrequency />
      <div className="absolute top-4 left-4 z-10">
        <ToysNav variant="mono" tone="violet" />
      </div>
    </div>
  );
}
