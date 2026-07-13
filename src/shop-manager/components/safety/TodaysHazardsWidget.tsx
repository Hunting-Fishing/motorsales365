import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { DailyShopInspection } from '@/types/safety';

interface TodaysHazardsWidgetProps {
  inspections: DailyShopInspection[];
  loading?: boolean;
}

export function TodaysHazardsWidget({ inspections, loading }: TodaysHazardsWidgetProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInspections = inspections.filter(i => i.inspection_date === todayStr);
  
  // Collect all hazards from today's inspections
  const allHazards = todayInspections.flatMap(i => 
    (i.hazards_identified || []).map(hazard => ({
      hazard,
      inspector: i.inspector_name,
      shift: i.shift
    }))
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Today's Hazards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Today's Hazards
          {allHazards.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {allHazards.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allHazards.length > 0 ? (
          <div className="space-y-2">
            {allHazards.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200"
              >
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.hazard}</p>
                  <p className="text-xs text-muted-foreground">
                    Reported by {item.inspector} ({item.shift} shift)
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-sm font-medium">No Hazards Today</p>
            <p className="text-xs text-muted-foreground">
              All clear from inspections
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
