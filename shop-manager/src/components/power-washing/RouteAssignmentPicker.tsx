import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Route, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface PowerWashingRoute {
  id: string;
  route_name: string;
  route_date: string;
  status: string;
  total_jobs: number | null;
  estimated_duration_minutes: number | null;
}

interface RouteAssignmentPickerProps {
  shopId: string;
  scheduledDate: Date | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string | null) => void;
}

export function RouteAssignmentPicker({
  shopId,
  scheduledDate,
  selectedRouteId,
  onSelectRoute,
}: RouteAssignmentPickerProps) {
  const formattedDate = scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : null;

  const { data: routes, isLoading } = useQuery({
    queryKey: ['power-washing-routes', shopId, formattedDate],
    queryFn: async () => {
      if (!formattedDate) return [];
      
      const { data, error } = await supabase
        .from('power_washing_routes')
        .select('id, route_name, route_date, status, total_jobs, estimated_duration_minutes')
        .eq('shop_id', shopId)
        .eq('route_date', formattedDate)
        .in('status', ['planned', 'in_progress'])
        .order('route_name', { ascending: true });
      
      if (error) throw error;
      return data as PowerWashingRoute[];
    },
    enabled: !!shopId && !!formattedDate,
  });

  if (!scheduledDate) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <Route className="h-4 w-4" />
          Assign to Route (Optional)
        </Label>
        <p className="text-sm text-muted-foreground italic">
          Select a scheduled date first to see available routes
        </p>
      </div>
    );
  }

  const selectedRoute = routes?.find(r => r.id === selectedRouteId);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Route className="h-4 w-4 text-primary" />
        Assign to Route (Optional)
      </Label>
      
      <Select 
        value={selectedRouteId || ''} 
        onValueChange={(value) => onSelectRoute(value || null)}
      >
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading routes..." : "Select a route for this date"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <span className="text-muted-foreground">No route assignment</span>
          </SelectItem>
          {routes?.map(route => (
            <SelectItem key={route.id} value={route.id}>
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4" />
                <span>{route.route_name}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {route.total_jobs || 0} jobs
                </Badge>
                {route.estimated_duration_minutes && (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor(route.estimated_duration_minutes / 60)}h {route.estimated_duration_minutes % 60}m
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {routes?.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">
          No routes available for {format(scheduledDate, 'MMM d, yyyy')}. 
          The job can still be created without a route assignment.
        </p>
      )}

      {selectedRoute && (
        <div className="p-2 bg-primary/5 rounded border border-primary/20 text-sm">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedRoute.route_name}</span>
            <Badge variant="outline">{selectedRoute.total_jobs || 0} existing jobs</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
