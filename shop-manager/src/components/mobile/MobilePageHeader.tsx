import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void;
  className?: string;
}

/**
 * Mobile-optimized page header with responsive layout
 * - Stacks actions below title on small screens
 * - Truncates long titles
 * - Touch-friendly back button
 */
export function MobilePageHeader({
  title,
  subtitle,
  icon,
  actions,
  onBack,
  className
}: MobilePageHeaderProps) {
  return (
    <div className={cn("mb-4 md:mb-8 space-y-3", className)}>
      {/* Title row */}
      <div className="flex items-start gap-2 md:gap-4">
        {onBack && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="shrink-0 h-9 w-9 md:h-10 md:w-10 mt-0.5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="truncate">{title}</span>
          </h1>
          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground mt-0.5 md:mt-1 line-clamp-2">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Desktop actions - inline with header */}
        {actions && (
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      
      {/* Mobile actions - stacked below header */}
      {actions && (
        <div className="flex md:hidden flex-wrap gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
