import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertTriangle, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { format } from 'date-fns';
import type { DailyShopInspection } from '@/types/safety';

interface InspectionAssignment {
  id: string;
  staff_id: string;
  shift: string;
  is_completed: boolean;
  staff?: {
    first_name: string;
    last_name: string;
  };
}

interface InspectionCompletionWidgetProps {
  inspections: DailyShopInspection[];
  loading?: boolean;
}

export function InspectionCompletionWidget({ inspections, loading }: InspectionCompletionWidgetProps) {
  const { shopId } = useShopId();
  const [assignments, setAssignments] = useState<InspectionAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInspections = inspections.filter(i => i.inspection_date === todayStr);
  
  // Expected inspections (morning, afternoon shifts at minimum)
  const expectedInspections = ['morning', 'afternoon'];
  const completedShifts = todayInspections.map(i => i.shift);

  useEffect(() => {
    if (shopId) {
      fetchTodayAssignments();
    }
  }, [shopId]);

  const fetchTodayAssignments = async () => {
    if (!shopId) return;
    
    setAssignmentsLoading(true);
    try {
      const { data, error } = await (supabase
        .from('inspection_assignments' as any)
        .select('id, staff_id, shift, is_completed')
        .eq('shop_id', shopId)
        .eq('assignment_date', todayStr)
        .eq('inspection_type', 'daily_inspection') as any);

      if (error) throw error;

      // Fetch staff names
      const staffIds = [...new Set((data || []).map((a: any) => a.staff_id))] as string[];
      let staffMap: Record<string, { first_name: string; last_name: string }> = {};

      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', staffIds);

        staffData?.forEach(s => {
          staffMap[s.id] = { first_name: s.first_name || '', last_name: s.last_name || '' };
        });
      }

      setAssignments((data || []).map((a: any) => ({
        ...a,
        staff: staffMap[a.staff_id]
      })));
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const getAssignmentForShift = (shift: string) => {
    return assignments.find(a => a.shift === shift);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Inspections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get missed assignments (assigned but not completed in past)
  const missedAssignments = assignments.filter(a => !a.is_completed && !todayInspections.some(i => i.shift === a.shift));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Today's Inspections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {expectedInspections.map((shift) => {
            const inspection = todayInspections.find(i => i.shift === shift);
            const assignment = getAssignmentForShift(shift);
            const isCompleted = !!inspection;
            const isMissed = assignment && !isCompleted && !assignment.is_completed;
            
            return (
              <div
                key={shift}
                className={`flex items-center justify-between p-3 rounded-lg border
                  ${isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 
                    isMissed ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-muted/50'}`}
              >
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : isMissed ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium capitalize">{shift} Shift</p>
                    {isCompleted && (
                      <p className="text-sm text-muted-foreground">
                        by {inspection.inspector_name}
                      </p>
                    )}
                    {!isCompleted && assignment?.staff && (
                      <p className={`text-sm ${isMissed ? 'text-red-600' : 'text-muted-foreground'}`}>
                        <User className="h-3 w-3 inline mr-1" />
                        Assigned: {assignment.staff.first_name} {assignment.staff.last_name}
                        {isMissed && ' (Missed)'}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={isCompleted ? 'default' : isMissed ? 'destructive' : 'secondary'}>
                  {isCompleted ? 'Completed' : isMissed ? 'Missed' : 'Pending'}
                </Badge>
              </div>
            );
          })}
          
          {todayInspections.length === 0 && assignments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No inspections completed or assigned today
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
