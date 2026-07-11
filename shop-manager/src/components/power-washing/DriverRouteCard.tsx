import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MapPin, 
  Clock, 
  Navigation,
  Play,
  ChevronDown,
  ChevronUp,
  Truck,
  Home,
  Building2,
  CheckCircle2,
  Circle,
  ArrowDown
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RouteStop {
  id: string;
  stop_order: number;
  job_id: string | null;
  location_address: string;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  status: string;
  travel_time_minutes?: number;
  travel_distance_miles?: number;
  job?: {
    id: string;
    job_number: string;
    status: string;
    estimated_duration_minutes?: number;
    service_type?: string;
    customer?: {
      first_name: string | null;
      last_name: string | null;
      company: string | null;
    } | null;
  } | null;
}

interface Route {
  id: string;
  route_name: string | null;
  route_date: string;
  status: string;
  total_jobs: number;
  total_distance_miles: number | null;
  estimated_duration_minutes: number | null;
  start_location: string | null;
  assigned_crew: any[];
}

interface DriverRouteCardProps {
  driverName: string;
  driverInitials: string;
  route: Route;
  stops: RouteStop[];
  shopLocation?: string;
  onStartRoute?: () => void;
  onOptimizeRoute?: () => void;
  onStopClick?: (stop: RouteStop) => void;
  isOptimizing?: boolean;
}

export function DriverRouteCard({
  driverName,
  driverInitials,
  route,
  stops,
  shopLocation = 'Shop Location',
  onStartRoute,
  onOptimizeRoute,
  onStopClick,
  isOptimizing = false
}: DriverRouteCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'arrived': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'pending': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStopIcon = (stop: RouteStop) => {
    if (stop.status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (stop.status === 'arrived' || stop.status === 'in_progress') {
      return <Circle className="h-5 w-5 text-amber-500 fill-amber-500" />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const getCustomerName = (stop: RouteStop) => {
    if (!stop.job?.customer) return 'Unknown';
    const { company, first_name, last_name } = stop.job.customer;
    if (company) return company;
    return `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown';
  };

  const sortedStops = [...stops].sort((a, b) => a.stop_order - b.stop_order);

  // Calculate cumulative time
  let cumulativeMinutes = 0;
  const startTime = new Date();
  startTime.setHours(8, 0, 0, 0); // Default start at 8 AM

  return (
    <Card className="border-border overflow-hidden">
      {/* Driver Header */}
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {driverInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{driverName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {route.route_name || `Route for ${format(new Date(route.route_date), 'MMM d')}`}
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(route.status)}>
            {route.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Route Summary Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Truck className="h-4 w-4" />
            <span>{route.total_jobs} stops</span>
          </div>
          {route.total_distance_miles && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{route.total_distance_miles.toFixed(1)} mi</span>
            </div>
          )}
          {route.estimated_duration_minutes && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {Math.floor(route.estimated_duration_minutes / 60)}h {route.estimated_duration_minutes % 60}m
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Expandable Stops Section */}
      <CardContent className="p-0">
        <button
          className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-sm font-medium">Step-by-Step Route</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {isExpanded && (
          <div className="px-4 py-3 space-y-0">
            {/* Start Location */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Home className="h-4 w-4 text-green-500" />
                </div>
                {sortedStops.length > 0 && (
                  <div className="w-0.5 h-8 bg-border mt-1" />
                )}
              </div>
              <div className="flex-1 pb-3">
                <p className="font-medium text-sm">START: {shopLocation}</p>
                <p className="text-xs text-muted-foreground">
                  {format(startTime, 'h:mm a')}
                </p>
              </div>
            </div>

            {/* Route Stops */}
            {sortedStops.map((stop, index) => {
              // Add travel time
              if (stop.travel_time_minutes) {
                cumulativeMinutes += stop.travel_time_minutes;
              }

              const estimatedArrival = new Date(startTime.getTime() + cumulativeMinutes * 60000);

              // Add job duration for next calculation
              if (stop.job?.estimated_duration_minutes) {
                cumulativeMinutes += stop.job.estimated_duration_minutes;
              } else {
                cumulativeMinutes += 30; // Default 30 min per job
              }

              const isLast = index === sortedStops.length - 1;

              return (
                <div key={stop.id}>
                  {/* Travel Indicator */}
                  {stop.travel_time_minutes && (
                    <div className="flex items-center gap-3 py-1">
                      <div className="flex flex-col items-center w-8">
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ↓ {stop.travel_time_minutes} min / {stop.travel_distance_miles?.toFixed(1) || '?'} mi
                      </p>
                    </div>
                  )}

                  {/* Stop Card */}
                  <div 
                    className={cn(
                      "flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -ml-2 transition-colors",
                      stop.status === 'in_progress' && "bg-amber-500/5"
                    )}
                    onClick={() => onStopClick?.(stop)}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{stop.stop_order}</span>
                      </div>
                      {!isLast && (
                        <div className="w-0.5 h-full min-h-[40px] bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">
                          {stop.location_address}
                        </p>
                        {getStopIcon(stop)}
                      </div>
                      {stop.job && (
                        <>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {getCustomerName(stop)}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="outline" className="text-xs h-5">
                              {stop.job.job_number}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Est. {stop.job.estimated_duration_minutes || 30} min
                            </span>
                          </div>
                        </>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        ETA: {format(estimatedArrival, 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Return to Shop (if configured) */}
            {sortedStops.length > 0 && route.start_location && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="flex flex-col items-center w-8">
                    <ArrowDown className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">↓ Return trip</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Home className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">RETURN: {shopLocation}</p>
                    <p className="text-xs text-muted-foreground">
                      Est. {format(new Date(startTime.getTime() + cumulativeMinutes * 60000), 'h:mm a')}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Empty state */}
            {sortedStops.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Navigation className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No stops added to this route yet</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 p-4 border-t border-border bg-muted/20">
          {onOptimizeRoute && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onOptimizeRoute}
              disabled={isOptimizing || sortedStops.length < 2}
            >
              <Navigation className="h-4 w-4 mr-1" />
              {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
            </Button>
          )}
          {route.status === 'planned' && onStartRoute && (
            <Button size="sm" className="flex-1" onClick={onStartRoute}>
              <Play className="h-4 w-4 mr-1" />
              Start Route
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
