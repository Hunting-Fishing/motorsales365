import React from 'react';
import { cn } from '@/lib/utils';

interface MobilePageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-optimized page container with responsive padding and overflow protection
 */
export function MobilePageContainer({ children, className }: MobilePageContainerProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background",
      "px-3 py-4 md:px-6 md:py-6", // Smaller padding on mobile
      "overflow-x-hidden max-w-full",
      className
    )}>
      {children}
    </div>
  );
}
