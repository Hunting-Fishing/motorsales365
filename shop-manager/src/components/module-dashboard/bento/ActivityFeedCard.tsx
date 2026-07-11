import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, ArrowRight } from 'lucide-react';

export interface ActivityFeedItem {
  id: string | number;
  icon?: LucideIcon;
  iconGradient?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: { label: string; tone?: 'default' | 'success' | 'warning' | 'destructive' };
  onClick?: () => void;
}

interface ActivityFeedCardProps {
  title: string;
  description?: string;
  items: ActivityFeedItem[];
  emptyLabel?: string;
  onViewAll?: () => void;
  className?: string;
}

const toneClasses: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  destructive: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

export function ActivityFeedCard({ title, description, items, emptyLabel = 'Nothing yet', onViewAll, className }: ActivityFeedCardProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card shadow-sm overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</div>
        ) : (
          items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                disabled={!item.onClick}
                className={cn(
                  'flex w-full items-center gap-3 px-5 py-3 text-left transition-colors',
                  item.onClick && 'hover:bg-muted/60 cursor-pointer',
                  'animate-fade-in',
                )}
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
              >
                {Icon && (
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white bg-gradient-to-br shadow-sm',
                      item.iconGradient ?? 'from-slate-400 to-slate-600',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      toneClasses[item.badge.tone ?? 'default'],
                    )}
                  >
                    {item.badge.label}
                  </span>
                )}
                {item.meta && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.meta}</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
