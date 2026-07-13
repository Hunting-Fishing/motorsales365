import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Wrench, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function ServiceDueDashboard() {
  const navigate = useNavigate();

  const { data: upcomingServices = [], isLoading } = useQuery({
    queryKey: ['upcoming-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, service_type, description, status, priority, start_time, technician_id, vehicle_id')
        .in('status', ['scheduled', 'in_progress', 'pending'])
        .order('start_time', { ascending: true, nullsFirst: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getServiceStatus = (startTime: string | null) => {
    if (!startTime) return { label: 'Not Scheduled', variant: 'secondary' as const };
    
    const date = new Date(startTime);
    const now = new Date();
    const daysDiff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) return { label: 'Overdue', variant: 'destructive' as const };
    if (daysDiff === 0) return { label: 'Due Today', variant: 'destructive' as const };
    if (daysDiff <= 3) return { label: `${daysDiff} days`, variant: 'default' as const };
    if (daysDiff <= 7) return { label: `${daysDiff} days`, variant: 'secondary' as const };
    return { label: format(date, 'MMM dd'), variant: 'outline' as const };
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading services...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Upcoming Services
            </CardTitle>
            <CardDescription>
              Scheduled maintenance and work orders
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => navigate('/work-orders')}>
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingServices.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No upcoming services scheduled</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/work-orders')}
            >
              Schedule Service
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingServices.slice(0, 5).map((service) => {
              const status = getServiceStatus(service.start_time);
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => navigate('/work-orders')}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-2 h-12 rounded-full ${getPriorityColor(service.priority || 'medium')}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{service.service_type || 'Service'}</p>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {service.description}
                        </p>
                      )}
                      {service.technician_id && (
                        <p className="text-xs text-muted-foreground">
                          Assigned technician
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {service.status?.replace('_', ' ') || 'Unknown'}
                  </Badge>
                </div>
              );
            })}
            {upcomingServices.length > 5 && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/work-orders')}
              >
                View All {upcomingServices.length} Services
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
