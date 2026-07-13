import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, parseISO } from 'date-fns';

export function UpcomingMaintenanceWidget() {
  const navigate = useNavigate();

  const { data: upcomingItems, isLoading } = useQuery({
    queryKey: ['upcoming-equipment-maintenance'],
    queryFn: async () => {
      const now = new Date();
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

      const { data, error } = await supabase
        .from('equipment_assets')
        .select('id, name, unit_number, equipment_type, next_service_date, current_hours')
        .not('next_service_date', 'is', null)
        .gte('next_service_date', now.toISOString().split('T')[0])
        .lte('next_service_date', twoWeeksFromNow.toISOString().split('T')[0])
        .order('next_service_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data || [];
    }
  });

  const getDaysUntil = (dateStr: string) => {
    return differenceInDays(parseISO(dateStr), new Date());
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 2) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (days <= 7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Maintenance (14 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingItems?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No upcoming maintenance scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingItems?.map((item) => {
              const daysUntil = getDaysUntil(item.next_service_date!);
              return (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/equipment/${item.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.name}</span>
                      {item.unit_number && (
                        <Badge variant="outline" className="text-xs">
                          #{item.unit_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{item.equipment_type}</span>
                      {item.current_hours && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.current_hours} hrs
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getUrgencyColor(daysUntil)}>
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(item.next_service_date!), 'MMM d')}
                    </span>
                  </div>
                </div>
              );
            })}
            {upcomingItems && upcomingItems.length > 0 && (
              <Button 
                variant="ghost" 
                className="w-full mt-2"
                onClick={() => navigate('/equipment')}
              >
                View All Equipment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
