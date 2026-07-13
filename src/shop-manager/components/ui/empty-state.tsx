import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  actionLink?: {
    label: string;
    to: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  actionLink,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed bg-muted/20 animate-fade-in', className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-14 text-center">
        {illustration ? (
          <div className="mb-5 w-full max-w-[200px] opacity-90">{illustration}</div>
        ) : icon ? (
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10">
            {icon}
          </div>
        ) : null}
        <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {actionLink ? (
            <Button asChild>
              <Link to={actionLink.to}>{actionLink.label}</Link>
            </Button>
          ) : action ? (
            <Button onClick={action.onClick}>{action.label}</Button>
          ) : null}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
