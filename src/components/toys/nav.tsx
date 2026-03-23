import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ToysNavProps = {
  label?: string;
  variant?: 'default' | 'mono';
  tone?: 'slate' | 'amber' | 'emerald' | 'violet';
  className?: string;
};

const accentStyles: Record<
  NonNullable<ToysNavProps['tone']>,
  string
> = {
  slate:
    'border-white/15 text-white/80 hover:border-white/40 hover:text-white',
  amber:
    'border-amber-300/70 text-amber-100 hover:border-amber-200 hover:text-amber-50 hover:shadow-[0_0_18px_rgba(251,191,36,0.25)]',
  emerald:
    'border-emerald-300/60 text-emerald-100 hover:border-emerald-200 hover:text-white hover:shadow-[0_0_18px_rgba(52,211,153,0.25)]',
  violet:
    'border-violet-300/60 text-violet-100 hover:border-violet-200 hover:text-white hover:shadow-[0_0_18px_rgba(167,139,250,0.25)]',
};

export default function ToysNav({
  label = 'Home',
  variant = 'default',
  tone = 'slate',
  className,
}: ToysNavProps) {
  if (variant === 'mono') {
    const accent = accentStyles[tone] ?? accentStyles.slate;

    return (
      <div className={cn('space-y-4', className)}>
        <Link
          href="/"
          className={cn(
            'group inline-flex items-center gap-2 rounded-full border bg-black/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80 backdrop-blur transition-transform transition-colors hover:-translate-y-0.5 hover:bg-white/10 shadow-lg shadow-black/25',
            accent
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>{label}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Button asChild variant="ghost" className="-ml-4">
        <Link href="/">
          <ChevronLeft className="w-4 font-eb-garamond h-4 mr-2" />
          {label}
        </Link>
      </Button>
    </div>
  );
}
