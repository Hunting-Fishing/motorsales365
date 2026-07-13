import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveContainer({ children, className }: ResponsiveContainerProps) {
  const { isMobile, isTablet } = useResponsive();
  
  return (
    <div className={cn(
      'transition-all duration-300 ease-in-out',
      isMobile ? 'px-2 py-4' : isTablet ? 'px-4 py-6' : 'px-6 py-6',
      className
    )}>
      {children}
    </div>
  );
}

interface MobileOptimizedTableProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileOptimizedTable({ children, className }: MobileOptimizedTableProps) {
  const { isMobile } = useResponsive();
  
  if (isMobile) {
    return (
      <div className={cn(
        'w-full overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background',
        'border rounded-lg shadow-sm',
        className
      )}>
        <div className="min-w-[800px]">
          {children}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('w-full overflow-auto border rounded-lg shadow-sm', className)}>
      {children}
    </div>
  );
}

interface TouchFriendlyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function TouchFriendlyButton({ 
  children, 
  onClick, 
  className, 
  variant = 'default',
  size = 'md' 
}: TouchFriendlyButtonProps) {
  const { isMobile } = useResponsive();
  
  const sizeClasses = {
    sm: isMobile ? 'px-4 py-3 text-sm' : 'px-3 py-2 text-sm',
    md: isMobile ? 'px-6 py-4' : 'px-4 py-2',
    lg: isMobile ? 'px-8 py-5 text-lg' : 'px-6 py-3 text-lg',
  };
  
  const baseClasses = cn(
    'transition-all duration-200 rounded-lg font-medium',
    'active:scale-95 hover:shadow-md',
    isMobile ? 'min-h-[44px] touch-manipulation' : '',
    sizeClasses[size],
    className
  );
  
  return (
    <button
      onClick={onClick}
      className={baseClasses}
      style={isMobile ? { WebkitTapHighlightColor: 'transparent' } : undefined}
    >
      {children}
    </button>
  );
}

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  className 
}: SwipeableCardProps) {
  const { isMobile } = useResponsive();
  const [startX, setStartX] = React.useState<number | null>(null);
  const [currentX, setCurrentX] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  }, [isMobile]);
  
  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isMobile || startX === null) return;
    const diff = e.touches[0].clientX - startX;
    setCurrentX(diff);
  }, [isMobile, startX]);
  
  const handleTouchEnd = React.useCallback(() => {
    if (!isMobile || startX === null) return;
    
    const threshold = 100;
    if (Math.abs(currentX) > threshold) {
      if (currentX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (currentX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setStartX(null);
    setCurrentX(0);
    setIsSwiping(false);
  }, [isMobile, startX, currentX, onSwipeLeft, onSwipeRight]);
  
  const transform = isSwiping ? `translateX(${currentX * 0.3}px)` : 'translateX(0px)';
  
  return (
    <div
      className={cn(
        'transition-transform duration-200 ease-out',
        isMobile ? 'touch-pan-y' : '',
        className
      )}
      style={{ transform }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}