"use client";

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Toy } from '@/lib/toys';
import { Music, Drum, Activity, Volleyball, Pointer, Flower, Fish } from 'lucide-react';
import { cn } from '@/lib/utils';

const IconMap = {
  Music,
  Drum,
  Activity,
  Volleyball,
  Pointer,
  Flower,
  Fish,
} as const;

export function ToyCard({ toy, className }: { toy: Toy; className?: string }) {
  const Icon = IconMap[toy.iconName as keyof typeof IconMap];
  
  return (
    <Link href={toy.path}>
      <Card className={cn(
        "h-full transition-all hover:shadow-lg hover:-translate-y-1 relative overflow-hidden",
        className === 'compact' && "p-2",
        className
      )}>
        {toy.backgroundImage && (
          <div 
            className="absolute inset-0 opacity-30 bg-cover bg-center"
            style={{ backgroundImage: `url(${toy.backgroundImage})` }}
          />
        )}
        <CardHeader className={cn(
          "flex flex-col gap-1 relative",
          className === 'compact' && "p-2 space-y-0"
        )}>
          <div className="flex items-center gap-2">
            <Icon className={cn(
              "w-5 h-5",
              className === 'compact' && "w-4 h-4"
            )} />
            <CardTitle className={cn(
              className === 'compact' && "text-sm"
            )}>{toy.name}</CardTitle>
          </div>
          <CardDescription className={cn(
            className === 'compact' && "text-xs"
          )}>{toy.description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}