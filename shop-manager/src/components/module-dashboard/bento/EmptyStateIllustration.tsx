import React from 'react';
import { cn } from '@/lib/utils';
import { Inbox, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateIllustrationProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyStateIllustration({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateIllustrationProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center',
        className,
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 blur-2xl" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-lg">
          <Icon className="h-7 w-7" />
        </div>
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-5">
          {action.label}
        </Button>
      )}
    </div>
  );
}
