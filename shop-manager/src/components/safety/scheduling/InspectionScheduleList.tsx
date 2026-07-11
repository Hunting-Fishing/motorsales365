import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, 
  Trash2, Edit, Play 
} from 'lucide-react';
import { useInspectionSchedules, InspectionSchedule } from '@/hooks/useInspectionSchedules';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';

interface InspectionScheduleListProps {
  onStartInspection?: (schedule: InspectionSchedule) => void;
  onEditSchedule?: (schedule: InspectionSchedule) => void;
}

export function InspectionScheduleList({ 
  onStartInspection, 
  onEditSchedule 
}: InspectionScheduleListProps) {
  const { schedules, loading, deleteSchedule, markInspectionComplete } = useInspectionSchedules();

  const getStatusBadge = (schedule: InspectionSchedule) => {
    if (!schedule.next_due_date) {
      return <Badge variant="secondary">No Schedule</Badge>;
    }

    const dueDate = parseISO(schedule.next_due_date);
    const isOverdue = isPast(dueDate);

    if (isOverdue) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>
      );
    }

    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          Due Soon
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-green-500 text-green-600">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        On Track
      </Badge>
    );
  };

  const getFrequencyLabel = (frequency: string, value: number) => {
    if (frequency === 'hours_based') return `Every ${value} hours`;
    if (value === 1) return frequency.charAt(0).toUpperCase() + frequency.slice(1);
    return `Every ${value} ${frequency === 'daily' ? 'days' : frequency === 'weekly' ? 'weeks' : 'months'}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No inspection schedules configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {schedules.map(schedule => (
        <Card key={schedule.id} className={!schedule.is_active ? 'opacity-60' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{schedule.schedule_name}</h4>
                  {getStatusBadge(schedule)}
                  {!schedule.is_active && (
                    <Badge variant="secondary">Paused</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getFrequencyLabel(schedule.frequency, schedule.frequency_value)}
                  </span>
                  {schedule.next_due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(parseISO(schedule.next_due_date), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <Badge variant="outline" className="mt-2 text-xs">
                  {schedule.inspection_type}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {onStartInspection && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      onStartInspection(schedule);
                      markInspectionComplete(schedule.id);
                    }}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                )}
                {onEditSchedule && (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => onEditSchedule(schedule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  size="icon" 
                  variant="ghost"
                  onClick={() => deleteSchedule(schedule.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
