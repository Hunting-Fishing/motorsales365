import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import { differenceInMinutes, parseISO } from 'date-fns';

interface RouteStop {
  id: string;
  status: string;
  estimated_arrival?: string;
  actual_arrival?: string;
  actual_departure?: string;
  estimated_duration_minutes?: number;
}

interface DeliveryRoute {
  id: string;
  status: string;
  start_time?: string;
  end_time?: string;
  total_stops: number;
  completed_stops: number;
}

interface DeliveryTimeStatsProps {
  routes: DeliveryRoute[];
  stops: RouteStop[];
}

export function DeliveryTimeStats({ routes, stops }: DeliveryTimeStatsProps) {
  const stats = useMemo(() => {
    const completedStops = stops.filter(s => s.status === 'completed' && s.actual_arrival);
    
    // Calculate average time at stop
    const stopsWithDuration = completedStops.filter(s => s.actual_arrival && s.actual_departure);
    const avgTimeAtStop = stopsWithDuration.length > 0
      ? stopsWithDuration.reduce((sum, s) => {
          const arrival = parseISO(s.actual_arrival!);
          const departure = parseISO(s.actual_departure!);
          return sum + differenceInMinutes(departure, arrival);
        }, 0) / stopsWithDuration.length
      : 0;

    // Calculate on-time percentage
    const stopsWithEta = completedStops.filter(s => s.estimated_arrival && s.actual_arrival);
    const onTimeStops = stopsWithEta.filter(s => {
      const estimated = parseISO(s.estimated_arrival!);
      const actual = parseISO(s.actual_arrival!);
      return differenceInMinutes(actual, estimated) <= 15; // Within 15 min is "on time"
    });
    const onTimePercentage = stopsWithEta.length > 0
      ? (onTimeStops.length / stopsWithEta.length) * 100
      : 0;

    // Calculate completed routes
    const completedRoutes = routes.filter(r => r.status === 'completed');
    
    // Calculate average route duration
    const routesWithDuration = completedRoutes.filter(r => r.start_time && r.end_time);
    const avgRouteDuration = routesWithDuration.length > 0
      ? routesWithDuration.reduce((sum, r) => {
          const start = parseISO(r.start_time!);
          const end = parseISO(r.end_time!);
          return sum + differenceInMinutes(end, start);
        }, 0) / routesWithDuration.length
      : 0;

    // Total stops completed today
    const totalCompleted = completedStops.length;

    return {
      avgTimeAtStop: Math.round(avgTimeAtStop),
      onTimePercentage: Math.round(onTimePercentage),
      avgRouteDuration: Math.round(avgRouteDuration),
      totalCompleted,
      completedRoutes: completedRoutes.length,
    };
  }, [routes, stops]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Avg Stop Time</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {stats.avgTimeAtStop}<span className="text-sm font-normal ml-1">min</span>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">On-Time Rate</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {stats.onTimePercentage}<span className="text-sm font-normal ml-1">%</span>
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Avg Route</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {Math.floor(stats.avgRouteDuration / 60)}h {stats.avgRouteDuration % 60}m
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {stats.totalCompleted}<span className="text-sm font-normal ml-1">stops</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
