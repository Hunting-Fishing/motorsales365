import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MilestoneAlertBadgeProps {
  overdueCount: number;
  approachingCount: number;
  size?: 'sm' | 'md';
}

export function MilestoneAlertBadge({ overdueCount, approachingCount, size = 'sm' }: MilestoneAlertBadgeProps) {
  if (overdueCount === 0 && approachingCount === 0) {
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {overdueCount > 0 && (
              <Badge 
                variant="destructive" 
                className={`${size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2 py-0.5'} flex items-center gap-1`}
              >
                <AlertTriangle className={iconSize} />
                {overdueCount}
              </Badge>
            )}
            {approachingCount > 0 && (
              <Badge 
                variant="secondary"
                className={`${size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2 py-0.5'} flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100`}
              >
                <Clock className={iconSize} />
                {approachingCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {overdueCount > 0 && <p>{overdueCount} overdue milestone{overdueCount !== 1 ? 's' : ''}</p>}
            {approachingCount > 0 && <p>{approachingCount} milestone{approachingCount !== 1 ? 's' : ''} approaching</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
