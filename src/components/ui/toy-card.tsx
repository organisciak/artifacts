"use client";

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Toy } from '@/lib/toys';
import { Music, Drum, Activity, Volleyball } from 'lucide-react';

const IconMap = {
  Music,
  Drum,
  Activity,
  Volleyball,
} as const;

export function ToyCard({ toy }: { toy: Toy }) {
  const Icon = IconMap[toy.iconName as keyof typeof IconMap];
  
  return (
    <Link href={toy.path}>
      <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <CardTitle>{toy.name}</CardTitle>
          </div>
          <CardDescription>{toy.description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}