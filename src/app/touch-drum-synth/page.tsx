"use client";
import TouchDrumSynth from '@/components/toys/touch-drum-synth';
import ToysNav from '@/components/toys/nav';
import { Footer } from '@/components/ui/footer';

export default function TouchSynthPage() {
  return (
    <main className="container mx-auto p-4 space-y-8">
      <ToysNav />
      <TouchDrumSynth />
      <Footer />
    </main>
  );
}