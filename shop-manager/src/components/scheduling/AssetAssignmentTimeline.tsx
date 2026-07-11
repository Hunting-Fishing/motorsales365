import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import type { AssetAssignment } from '@/types/assetAssignment';
import { Repeat } from 'lucide-react';

interface AssetAssignmentTimelineProps {
  assignments: AssetAssignment[];
}

const ASSET_TYPE_COLORS = {
  equipment: 'bg-blue-500',
  vessel: 'bg-cyan-500',
  vehicle: 'bg-purple-500'
};

export function AssetAssignmentTimeline({ assignments }: AssetAssignmentTimelineProps) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group assignments by employee
  const assignmentsByEmployee = useMemo(() => {
    const grouped = new Map<string, AssetAssignment[]>();
    
    assignments.forEach(assignment => {
      const key = `${assignment.employee_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(assignment);
    });

    return Array.from(grouped.entries()).map(([_, assigns]) => ({
      employee: assigns[0].profiles,
      assignments: assigns.sort((a, b) => 
        new Date(a.assignment_start).getTime() - new Date(b.assignment_start).getTime()
      )
    }));
  }, [assignments]);

  const getAssignmentForDay = (assignments: AssetAssignment[], day: Date) => {
    return assignments.find(a => {
      const start = parseISO(a.assignment_start);
      const end = parseISO(a.assignment_end);
      return day >= start && day <= end;
    });
  };

  if (assignmentsByEmployee.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No assignments to display in timeline
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment Timeline - {format(today, 'MMMM yyyy')}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Calendar header */}
          <div className="grid grid-cols-[200px_1fr] gap-2 mb-2">
            <div className="font-medium text-sm">Employee</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
              {days.map(day => (
                <div
                  key={day.toISOString()}
                  className={`text-center text-xs p-1 ${
                    isSameDay(day, today) ? 'bg-primary text-primary-foreground rounded' : ''
                  }`}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>

          {/* Employee rows */}
          {assignmentsByEmployee.map(({ employee, assignments: empAssignments }) => (
            <div key={employee?.email} className="grid grid-cols-[200px_1fr] gap-2 mb-4">
              <div className="flex items-center text-sm font-medium truncate">
                {employee?.first_name} {employee?.last_name}
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                {days.map(day => {
                  const assignment = getAssignmentForDay(empAssignments, day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-8 rounded-sm flex items-center justify-center ${
                        assignment
                          ? ASSET_TYPE_COLORS[assignment.asset_type]
                          : 'bg-muted/30'
                      }`}
                      title={assignment ? `${assignment.asset_type} - ${assignment.purpose || 'No purpose'}` : ''}
                    >
                      {assignment?.is_recurring && (
                        <Repeat className="h-3 w-3 text-white" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex gap-4 mt-6 pt-4 border-t">
            <div className="text-sm font-medium">Legend:</div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500" />
                <span className="text-xs">Equipment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-cyan-500" />
                <span className="text-xs">Vessel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-500" />
                <span className="text-xs">Vehicle</span>
              </div>
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                <span className="text-xs">Recurring</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
