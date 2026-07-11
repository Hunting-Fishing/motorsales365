import React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Render the title block inside a subtle hero card. */
  hero?: boolean;
}

/**
 * Standard page chrome for list/detail/form pages.
 * - Semantic-token background, generous spacing, animated fade-in.
 * - Drop into any new page without touching shadcn primitives.
 */
export function PageShell({
  title,
  description,
  eyebrow,
  actions,
  children,
  className,
  contentClassName,
  hero = false,
}: PageShellProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8 lg:px-8 animate-fade-in">
        <header
          className={cn(
            'mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
            hero && 'relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-6 shadow-sm md:p-8',
          )}
        >
          {hero && (
            <>
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
            </>
          )}
          <div className="relative min-w-0">
            {eyebrow && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                {eyebrow}
              </p>
            )}
            <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground md:text-base">{description}</p>
            )}
          </div>
          {actions && <div className="relative flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </header>

        <div className={cn('space-y-6', contentClassName)}>{children}</div>
      </div>
    </div>
  );
}
