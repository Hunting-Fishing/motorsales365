import React from 'react';
import { cn } from '@/lib/utils';

interface GradientOrbsProps {
  /** Tailwind color classes for the 3 orbs, e.g. ["bg-indigo-500","bg-violet-500","bg-sky-400"] */
  colors?: [string, string, string];
  className?: string;
  intensity?: 'soft' | 'normal' | 'bold';
}

const intensityMap = {
  soft: ['opacity-15', 'opacity-10', 'opacity-10'],
  normal: ['opacity-30', 'opacity-25', 'opacity-15'],
  bold: ['opacity-50', 'opacity-40', 'opacity-30'],
};

export function GradientOrbs({
  colors = ['bg-indigo-500', 'bg-violet-500', 'bg-sky-400'],
  className,
  intensity = 'normal',
}: GradientOrbsProps) {
  const ops = intensityMap[intensity];
  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className={cn('absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl', colors[0], ops[0])} />
      <div className={cn('absolute -bottom-32 left-1/3 h-96 w-96 rounded-full blur-3xl', colors[1], ops[1])} />
      <div className={cn('absolute -top-10 right-10 h-72 w-72 rounded-full blur-3xl', colors[2], ops[2])} />
    </div>
  );
}
