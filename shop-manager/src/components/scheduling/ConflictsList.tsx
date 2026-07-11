import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { SchedulingConflict } from '@/types/scheduling-conflicts';

interface ConflictsListProps {
  conflicts: SchedulingConflict[];
  onResolve: (conflictId: string) => void;
}

export function ConflictsList({ conflicts, onResolve }: ConflictsListProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 hover:bg-red-600';
      case 'high': return 'bg-orange-500 hover:bg-orange-600';
      case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'low': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'double_booking': return 'Double Booking';
      case 'overlapping_shift': return 'Overlapping Shift';
      case 'time_off_conflict': return 'Time Off Conflict';
      case 'accommodation_conflict': return 'Accommodation Conflict';
      case 'overtime': return 'Overtime Warning';
      case 'understaffed': return 'Understaffed';
      default: return type;
    }
  };

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            No Conflicts Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">All schedules are conflict-free for this period.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Scheduling Conflicts ({conflicts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="p-4 rounded-lg border bg-card space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(conflict.severity)}>
                      {conflict.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {getConflictTypeLabel(conflict.conflict_type)}
                    </Badge>
                  </div>
                  
                  <p className="font-medium">
                    {conflict.profiles 
                      ? `${conflict.profiles.first_name} ${conflict.profiles.last_name}`
                      : 'Unknown Employee'}
                  </p>
                  
                  <p className="text-sm text-muted-foreground">
                    {conflict.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(conflict.conflict_date), 'MMM d, yyyy')}
                    {conflict.conflict_start_time && conflict.conflict_end_time && (
                      <span>
                        • {conflict.conflict_start_time} - {conflict.conflict_end_time}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve(conflict.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
