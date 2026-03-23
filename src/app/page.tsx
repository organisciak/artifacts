import { Toy, toys } from '@/lib/toys';
import { ToyCard } from '@/components/ui/toy-card';
import { Footer } from '@/components/ui/footer';
import Link from 'next/link';

export default function Home() {
  const inProgressToys = toys.filter(t => t.inProgress);

  return (
    <main className="container mx-auto p-4 space-y-8">
      {inProgressToys.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">🐟</span>
            <h2 className="text-lg font-semibold text-blue-800">In Progress</h2>
          </div>
          <ul className="space-y-2">
            {inProgressToys.map(toy => (
              <li key={toy.id} className="flex items-center gap-2 text-blue-900">
                <span className="text-blue-400">○</span>
                <Link href={toy.path} className="hover:underline font-medium">{toy.name}</Link>
                {toy.progressNote && (
                  <span className="text-sm text-blue-600">- {toy.progressNote}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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

      <Footer />
    </main>
  );
}
