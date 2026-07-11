import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Clock, AlertTriangle, CheckCircle, Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ServiceAlert {
  id: string;
  equipment_id: string;
  alert_type: string;
  service_item: string;
  due_hours: number | null;
  due_date: string | null;
  current_hours: number | null;
  priority: string;
  is_acknowledged: boolean;
  created_at: string;
  equipment?: {
    name: string;
    equipment_type: string | null;
  };
}

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400'
};

export function ServiceAlertsPanel() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['service-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspection_service_alerts')
        .select(`
          *,
          equipment:equipment_assets!equipment_id (
            name,
            equipment_type
          )
        `)
        .eq('is_acknowledged', false)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ServiceAlert[];
    }
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('inspection_service_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-alerts'] });
      toast({ title: 'Alert acknowledged' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const getPriorityBadge = (priority: string) => {
    const Icon = priority === 'critical' ? AlertTriangle : Clock;
    return (
      <Badge className={cn('text-xs', PRIORITY_STYLES[priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.medium)}>
        <Icon className="h-3 w-3 mr-1" />
        {priority}
      </Badge>
    );
  };

  const getAlertMessage = (alert: ServiceAlert) => {
    if (alert.alert_type === 'hours_due' && alert.due_hours && alert.current_hours) {
      const remaining = alert.due_hours - alert.current_hours;
      if (remaining <= 0) {
        return `Overdue by ${Math.abs(remaining).toFixed(1)} hours`;
      }
      return `${remaining.toFixed(1)} hours remaining`;
    }
    if (alert.alert_type === 'overdue') {
      return 'Service overdue';
    }
    if (alert.due_date) {
      return `Due ${formatDistanceToNow(new Date(alert.due_date), { addSuffix: true })}`;
    }
    return 'Service needed';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Service Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">No pending service alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Service Alerts
          </div>
          <Badge variant="secondary">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="divide-y">
            {alerts.map(alert => (
              <div key={alert.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {alert.equipment?.name || 'Unknown Equipment'}
                      </span>
                    </div>
                    <p className="text-sm">{alert.service_item}</p>
                    <p className="text-xs text-muted-foreground">
                      {getAlertMessage(alert)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getPriorityBadge(alert.priority)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                      disabled={acknowledgeMutation.isPending}
                    >
                      {acknowledgeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Acknowledge'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
