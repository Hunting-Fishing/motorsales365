import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Tailwind gradient pair, e.g. "from-indigo-500 to-violet-500". Defaults to muted. */
  gradient?: string;
}

interface QuickActionRailProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActionRail({ actions, className }: QuickActionRailProps) {
  return (
    <div className={cn('-mx-1 flex gap-2 overflow-x-auto pb-2 px-1 snap-x snap-mandatory scrollbar-thin', className)}>
      {actions.map((a, i) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className={cn(
            'group snap-start shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm',
            'hover:border-primary/30 hover:shadow transition-all',
            'animate-fade-in',
          )}
          style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
        >
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-white bg-gradient-to-br shadow-sm transition-transform group-hover:scale-110',
              a.gradient ?? 'from-slate-500 to-slate-700',
            )}
          >
            <a.icon className="h-3.5 w-3.5" />
          </span>
          <span className="whitespace-nowrap">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
