import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="text-center text-sm text-muted-foreground">
      Made with <Heart className="inline h-4 w-4 text-red-500" aria-label="heart" /> but mostly 
      <a href="https://claude.ai" 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-block mx-1"
      > 
      <img 
        src="/simple-icons/claude.svg" 
        alt="Claude"
        width={20}
        height={20}
        className="inline-block mx-1 text-orange-400"
      />
      </a>
       by{' '}
      <a 
        href="https://porg.dev" 
        className="underline hover:text-foreground transition-colors"
        target="_blank" 
        rel="noopener noreferrer"
      >
        porg.dev
      </a>
    </footer>
  );
} 