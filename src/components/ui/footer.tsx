export function Footer() {
  return (
    <footer className="text-center text-sm text-muted-foreground">
      Made with <span role="img" aria-label="heart">❤️</span> by{' '}
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