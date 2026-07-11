import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight, LucideIcon } from 'lucide-react';

interface CategoryTileProps {
  label: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind gradient pair, e.g. "from-indigo-500 to-violet-500" */
  gradient: string;
  onClick: () => void;
  delay?: number;
  badge?: string | number;
}

export function CategoryTile({ label, description, icon: Icon, gradient, onClick, delay = 0, badge }: CategoryTileProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 text-left',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/20',
        'animate-fade-in',
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40',
          gradient,
        )}
      />

      <div className="flex w-full items-start justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-110',
            gradient,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-2">
          {badge !== undefined && badge !== null && badge !== '' && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {badge}
            </span>
          )}
          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>

      <div className="relative">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
