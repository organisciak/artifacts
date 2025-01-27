import { toys } from '@/lib/toys';
import { ToyCard } from '@/components/ui/toy-card';
import { Footer } from '@/components/ui/footer';

export default function Home() {
  return (
    <main className="container mx-auto p-4 space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Web Toys</h1>
        <p className="text-lg text-muted-foreground">
          A collection of interactive browser experiments. 
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryToys.map((toy) => (
                <ToyCard key={toy.id} toy={toy} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Footer />
    </main>
  );
}