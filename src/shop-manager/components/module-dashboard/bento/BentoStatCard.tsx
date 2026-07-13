import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface BentoStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Tailwind gradient pair, e.g. "from-indigo-500 to-violet-500" */
  gradient: string;
  featured?: boolean;
  delay?: number;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  onClick?: () => void;
}

export function BentoStatCard({
  title,
  value,
  icon: Icon,
  gradient,
  featured,
  delay = 0,
  hint,
  trend,
  onClick,
}: BentoStatCardProps) {
  const Wrapper: any = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all duration-300',
        'hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/20',
        'animate-fade-in',
        featured && 'sm:col-span-2 sm:row-span-1',
        onClick && 'cursor-pointer w-full',
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* gradient wash on hover */}
      <div
        className={cn(
          'pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-30',
          gradient,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p
            className={cn(
              'mt-2 font-heading font-bold tabular-nums text-foreground',
              featured ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl',
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {trend && (
            <p
              className={cn(
                'mt-1 inline-flex items-center text-xs font-medium',
                trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {trend.positive ? '▲' : '▼'} {trend.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-110',
            gradient,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {featured && (
        <div className="relative mt-4 flex h-10 items-end gap-1">
          {[40, 65, 50, 80, 55, 90, 70, 100].map((h, i) => (
            <div
              key={i}
              className={cn('flex-1 rounded-sm bg-gradient-to-t opacity-60 transition-all group-hover:opacity-100', gradient)}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      )}
    </Wrapper>
  );
}
