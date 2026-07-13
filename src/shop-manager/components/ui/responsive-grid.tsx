
import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({ 
  children, 
  cols = { default: 1 }, 
  gap = 'md',
  className 
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  };

  const colClasses = [];
  if (cols.default) colClasses.push(`grid-cols-${cols.default}`);
  if (cols.sm) colClasses.push(`sm:grid-cols-${cols.sm}`);
  if (cols.md) colClasses.push(`md:grid-cols-${cols.md}`);
  if (cols.lg) colClasses.push(`lg:grid-cols-${cols.lg}`);
  if (cols.xl) colClasses.push(`xl:grid-cols-${cols.xl}`);

  return (
    <div className={cn('grid', gapClasses[gap], ...colClasses, className)}>
      {children}
    </div>
  );
}
