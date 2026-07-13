import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface BentoStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string; // tailwind "from-X to-Y"
  featured?: boolean;
  delay?: number;
  hint?: string;
}

export function BentoStatCard({ title, value, icon: Icon, gradient, featured, delay = 0, hint }: BentoStatCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-xl hover:border-transparent',
        'animate-fade-in',
        featured && 'sm:col-span-2 sm:row-span-1',
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* gradient border / glow on hover */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br',
          gradient,
        )}
        style={{ padding: 1, WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className={cn('mt-2 font-heading font-bold tabular-nums text-foreground', featured ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl')}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', gradient)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {featured && (
        <div className="relative mt-4 flex h-10 items-end gap-1">
          {[40, 65, 50, 80, 55, 90, 70, 100].map((h, i) => (
            <div
              key={i}
              className={cn('flex-1 rounded-sm bg-gradient-to-t opacity-70 transition-all group-hover:opacity-100', gradient)}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
