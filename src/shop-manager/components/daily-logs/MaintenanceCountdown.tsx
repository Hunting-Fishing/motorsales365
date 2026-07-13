import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Clock, Droplets, Filter, Wrench, Package } from 'lucide-react';
import { MaintenanceInterval, useMaintenanceIntervalTracking } from '@/hooks/useMaintenanceIntervalTracking';
import { cn } from '@/lib/utils';

interface MaintenanceCountdownProps {
  equipmentId: string;
  currentHours: number;
}

const INTERVAL_ICONS: Record<string, React.ReactNode> = {
  oil_change: <Droplets className="h-4 w-4" />,
  filter_change: <Filter className="h-4 w-4" />,
  belt_inspection: <Wrench className="h-4 w-4" />,
  default: <Clock className="h-4 w-4" />
};

export function MaintenanceCountdown({ equipmentId, currentHours }: MaintenanceCountdownProps) {
  const { intervals, calculateCountdown, isLoading } = useMaintenanceIntervalTracking(equipmentId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">Loading maintenance intervals...</p>
        </CardContent>
      </Card>
    );
  }

  if (!intervals || intervals.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No maintenance intervals configured</p>
          <p className="text-xs text-muted-foreground mt-1">
            Set up intervals in the Maintenance tab to see countdown
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Maintenance Countdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {intervals.map((interval) => {
          const countdown = calculateCountdown(interval, currentHours);
          const icon = INTERVAL_ICONS[interval.interval_type] || INTERVAL_ICONS.default;
          
          // Calculate progress percentage (inverse - higher is more urgent)
          const progressPercentage = interval.interval_hours 
            ? Math.min(100, Math.max(0, ((interval.interval_hours - countdown.hoursRemaining) / interval.interval_hours) * 100))
            : 0;

          return (
            <div 
              key={interval.id} 
              className={cn(
                "p-3 rounded-lg border",
                countdown.urgency === 'red' && "bg-destructive/10 border-destructive/30",
                countdown.urgency === 'yellow' && "bg-yellow-500/10 border-yellow-500/30",
                countdown.urgency === 'green' && "bg-muted/50 border-border"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="font-medium text-sm">{interval.interval_name}</span>
                </div>
                <Badge 
                  variant={countdown.isOverdue ? "destructive" : "secondary"}
                  className={cn(
                    countdown.urgency === 'yellow' && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
                    countdown.urgency === 'green' && "bg-green-500/20 text-green-700 dark:text-green-400"
                  )}
                >
                  {countdown.isOverdue ? 'OVERDUE' : `${countdown.hoursRemaining.toFixed(0)} hrs left`}
                </Badge>
              </div>

              <Progress 
                value={progressPercentage} 
                className={cn(
                  "h-2 mb-2",
                  countdown.urgency === 'red' && "[&>div]:bg-destructive",
                  countdown.urgency === 'yellow' && "[&>div]:bg-yellow-500",
                  countdown.urgency === 'green' && "[&>div]:bg-green-500"
                )}
              />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {countdown.daysRemaining !== null 
                    ? `~${countdown.daysRemaining} days at current usage`
                    : 'Unable to predict days'
                  }
                </span>
                <span>Every {interval.interval_hours} hrs</span>
              </div>

              {/* Parts Needed */}
              {interval.parts_needed && interval.parts_needed.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                    <Package className="h-3 w-3" />
                    Parts to Prepare:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {interval.parts_needed.map((part, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {part.qty}{part.unit ? ` ${part.unit}` : 'x'} {part.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
