import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export function PMSchedulesList() {
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['pm-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_pm_schedules')
        .select('*')
        .eq('is_active', true)
        .order('next_service_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preventive Maintenance Schedules</CardTitle>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !schedules || schedules.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No PM schedules found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule: any) => (
              <Card key={schedule.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{schedule.schedule_name}</h3>
                      {schedule.is_overdue && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground">{schedule.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>Frequency: {schedule.frequency_type}</span>
                      {schedule.next_service_date && (
                        <span>Next Service: {format(new Date(schedule.next_service_date), 'MMM d, yyyy')}</span>
                      )}
                      {schedule.estimated_duration && (
                        <span>Est. Duration: {schedule.estimated_duration}h</span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
