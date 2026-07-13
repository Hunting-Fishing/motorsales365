import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSafetySchedules } from '@/hooks/useSafetySchedules';
import { format, isToday, isTomorrow, isPast, addDays, isBefore } from 'date-fns';

export function UpcomingInspectionsWidget() {
  const navigate = useNavigate();
  const { schedules, loading } = useSafetySchedules();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const activeSchedules = schedules.filter(s => s.is_enabled);
  const now = new Date();
  const sevenDaysFromNow = addDays(now, 7);

  const overdueSchedules = activeSchedules.filter(s => 
    s.next_due_date && isPast(new Date(s.next_due_date))
  );

  const upcomingSchedules = activeSchedules.filter(s => 
    s.next_due_date && 
    !isPast(new Date(s.next_due_date)) &&
    isBefore(new Date(s.next_due_date), sevenDaysFromNow)
  );

  const todayCount = activeSchedules.filter(s => 
    s.next_due_date && isToday(new Date(s.next_due_date))
  ).length;

  const tomorrowCount = activeSchedules.filter(s => 
    s.next_due_date && isTomorrow(new Date(s.next_due_date))
  ).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-primary" />
            Scheduled Inspections
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/safety/schedules')}
          >
            View Schedule
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {overdueSchedules.length > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-destructive/10">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Overdue</span>
              </div>
              <Badge variant="destructive">{overdueSchedules.length}</Badge>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-primary mb-1" />
              <span className="text-xl font-bold">{todayCount}</span>
              <span className="text-xs text-muted-foreground">Due Today</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-xl font-bold">{tomorrowCount}</span>
              <span className="text-xs text-muted-foreground">Due Tomorrow</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            {upcomingSchedules.length} inspections due in next 7 days
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
