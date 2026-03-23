"use client";

import { useState } from 'react';
import { Toy, toys } from '@/lib/toys';
import { ToyCard } from '@/components/ui/toy-card';
import { Footer } from '@/components/ui/footer';

export default function Home() {
  const [showInProgress, setShowInProgress] = useState(false);
  const inProgressToys = toys.filter(t => t.inProgress);
  const hasInProgress = inProgressToys.length > 0;

  return (
    <main className="container mx-auto p-4 space-y-8">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold italic font-eb-garamond">etc</h1>
        <p className="text-lg text-muted-foreground font-eb-garamond">
          A collection of interactive browser experiments and utilities.
        </p>
      </div>
      
      <div className="space-y-8">
        {Object.entries(
          toys.reduce((acc, toy) => {
            const category = toy.category;
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(toy);
            return acc;
          }, {} as Record<string, Toy[]>)
        ).map(([category, categoryToys]) => (
          <div key={category} className="space-y-4">
            <h2 className="text-2xl font-semibold">{category}</h2>
            <div className={`grid gap-4 ${
              category === 'Crumbs' 
                ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {categoryToys.map((toy) => (
                <ToyCard 
                  key={toy.id} 
                  toy={toy} 
                  className={category === 'Crumbs' ? 'compact' : ''} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {showInProgress && hasInProgress && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium">In Progress</h3>
          <ul className="space-y-1">
            {inProgressToys.map(toy => (
              <li key={toy.id} className="flex items-center gap-2">
                <span className="text-muted-foreground/50">○</span>
                <a href={toy.path} className="hover:underline">{toy.name}</a>
                {toy.progressNote && (
                  <span className="text-muted-foreground/70">— {toy.progressNote}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Details</h2>
        <p className="text-lg text-muted-foreground">
          The source code is available on{' '}
          <a 
            href="https://github.com/organisciak/artifacts" 
            className="underline hover:text-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>.
        </p>
      </div>

      {hasInProgress && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground/60 cursor-pointer">
          <input
            type="checkbox"
            checked={showInProgress}
            onChange={(e) => setShowInProgress(e.target.checked)}
            className="rounded border-muted-foreground/30"
          />
          <span>Show in-progress</span>
        </label>
      )}

      <Footer />
    </main>
  );
}
