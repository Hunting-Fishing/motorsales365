import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Interval {
  id: string;
  interval_name: string;
  interval_hours: number;
  last_service_hours: number;
  next_service_hours: number;
  last_service_date?: string;
}

interface ServiceIntervalCountdownProps {
  intervals: Interval[];
  currentHours: number;
}

export function ServiceIntervalCountdown({ intervals, currentHours }: ServiceIntervalCountdownProps) {
  if (!intervals || intervals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Service Intervals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {intervals.map((interval) => {
          const hoursRemaining = Math.max(0, (interval.next_service_hours || 0) - currentHours);
          const totalInterval = interval.interval_hours || 1;
          const hoursSinceService = currentHours - (interval.last_service_hours || 0);
          const progressPercent = Math.min(100, (hoursSinceService / totalInterval) * 100);
          
          const isOverdue = hoursRemaining <= 0;
          const isDueSoon = hoursRemaining > 0 && hoursRemaining <= totalInterval * 0.1; // Within 10%

          return (
            <div key={interval.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{interval.interval_name}</span>
                  {isOverdue ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  ) : isDueSoon ? (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      <Clock className="h-3 w-3 mr-1" />
                      Due Soon
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      OK
                    </Badge>
                  )}
                </div>
                <span className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-foreground'}`}>
                  {isOverdue ? `${Math.abs(hoursRemaining).toFixed(1)} hrs overdue` : `${hoursRemaining.toFixed(1)} hrs remaining`}
                </span>
              </div>
              
              <Progress 
                value={progressPercent} 
                className={`h-2 ${isOverdue ? '[&>div]:bg-red-500' : isDueSoon ? '[&>div]:bg-amber-500' : ''}`}
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last: {interval.last_service_hours?.toLocaleString() || 0} hrs</span>
                <span>Next: {interval.next_service_hours?.toLocaleString() || 0} hrs</span>
              </div>
              
              {interval.last_service_date && (
                <p className="text-xs text-muted-foreground">
                  Last serviced: {new Date(interval.last_service_date).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
