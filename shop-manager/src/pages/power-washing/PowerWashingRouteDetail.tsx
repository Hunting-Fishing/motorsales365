import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import {
  Navigation,
  Calendar,
  Clock,
  MapPin,
  Users,
  Truck,
  Play,
  CheckCircle,
  Plus,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface RouteStop {
  id: string;
  route_id: string;
  job_id: string;
  stop_order: number;
  estimated_arrival: string | null;
  actual_arrival: string | null;
  status: string;
  notes: string | null;
  job?: {
    id: string;
    job_number: string;
    property_type: string | null;
    property_address: string | null;
    status: string | null;
  } | null;
}

interface Route {
  id: string;
  route_date: string;
  route_name: string | null;
  assigned_crew: any[];
  total_jobs: number;
  estimated_duration_minutes: number | null;
  total_distance_miles: number | null;
  status: string;
  start_location: string | null;
  end_location: string | null;
  notes: string | null;
}

export default function PowerWashingRouteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddJobOpen, setIsAddJobOpen] = React.useState(false);
  const [selectedJobId, setSelectedJobId] = React.useState<string>('');

  // Fetch route details
  const { data: route, isLoading: isLoadingRoute } = useQuery({
    queryKey: ['power-washing-route', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_routes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Route;
    },
    enabled: !!id,
  });

  // Fetch route stops with job details
  const { data: stops, isLoading: isLoadingStops } = useQuery({
    queryKey: ['power-washing-route-stops', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_route_stops')
        .select(`
          *,
          job:power_washing_jobs(
            id,
            job_number,
            property_type,
            property_address,
            status
          )
        `)
        .eq('route_id', id)
        .order('stop_order', { ascending: true });
      
      if (error) throw error;
      return data as unknown as RouteStop[];
    },
    enabled: !!id,
  });

  // Fetch available jobs for adding to route
  const { data: availableJobs } = useQuery({
    queryKey: ['power-washing-jobs-for-route', route?.route_date],
    queryFn: async () => {
      if (!route?.route_date) return [];
      
      const { data, error } = await supabase
        .from('power_washing_jobs')
        .select('id, job_number, property_type, property_address')
        .eq('scheduled_date', route.route_date)
        .in('status', ['pending', 'scheduled', 'in_progress']);
      
      if (error) throw error;
      
      // Filter out jobs already in this route
      const stopJobIds = stops?.map(s => s.job_id) || [];
      return data?.filter(job => !stopJobIds.includes(job.id)) || [];
    },
    enabled: !!route?.route_date && !!stops,
  });

  // Update route status
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('power_washing_routes')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-route', id] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-routes'] });
      toast.success('Route status updated');
    },
    onError: () => toast.error('Failed to update route status'),
  });

  // Add job to route
  const addStopMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const nextOrder = (stops?.length || 0) + 1;
      
      const { error } = await supabase
        .from('power_washing_route_stops')
        .insert({
          route_id: id,
          job_id: jobId,
          stop_order: nextOrder,
          status: 'pending',
        });
      
      if (error) throw error;

      // Update total_jobs count
      await supabase
        .from('power_washing_routes')
        .update({ total_jobs: nextOrder })
        .eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-route-stops', id] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-route', id] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-jobs-for-route'] });
      setIsAddJobOpen(false);
      setSelectedJobId('');
      toast.success('Job added to route');
    },
    onError: () => toast.error('Failed to add job to route'),
  });

  // Remove stop from route
  const removeStopMutation = useMutation({
    mutationFn: async (stopId: string) => {
      const { error } = await supabase
        .from('power_washing_route_stops')
        .delete()
        .eq('id', stopId);
      
      if (error) throw error;

      // Reorder remaining stops and update count
      const remainingStops = stops?.filter(s => s.id !== stopId) || [];
      for (let i = 0; i < remainingStops.length; i++) {
        await supabase
          .from('power_washing_route_stops')
          .update({ stop_order: i + 1 })
          .eq('id', remainingStops[i].id);
      }

      await supabase
        .from('power_washing_routes')
        .update({ total_jobs: remainingStops.length })
        .eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-route-stops', id] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-route', id] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-jobs-for-route'] });
      toast.success('Stop removed from route');
    },
    onError: () => toast.error('Failed to remove stop'),
  });

  // Update stop status
  const updateStopStatusMutation = useMutation({
    mutationFn: async ({ stopId, status }: { stopId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'arrived') {
        updates.actual_arrival = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('power_washing_route_stops')
        .update(updates)
        .eq('id', stopId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-route-stops', id] });
      toast.success('Stop status updated');
    },
    onError: () => toast.error('Failed to update stop'),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'in_progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case 'arrived': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'skipped': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStopStatusOptions = () => {
    const options = [
      { value: 'pending', label: 'Pending' },
      { value: 'arrived', label: 'Arrived' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'skipped', label: 'Skipped' },
    ];
    return options;
  };

  if (isLoadingRoute) {
    return (
      <MobilePageContainer>
        <MobilePageHeader
          title="Loading..."
          onBack={() => navigate('/power-washing/routes')}
        />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MobilePageContainer>
    );
  }

  if (!route) {
    return (
      <MobilePageContainer>
        <MobilePageHeader
          title="Route Not Found"
          onBack={() => navigate('/power-washing/routes')}
        />
        <Card>
          <CardContent className="p-12 text-center">
            <Navigation className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">Route Not Found</h3>
            <p className="text-muted-foreground mb-4">
              This route may have been deleted or doesn't exist.
            </p>
            <Button onClick={() => navigate('/power-washing/routes')}>
              Back to Routes
            </Button>
          </CardContent>
        </Card>
      </MobilePageContainer>
    );
  }

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title={route.route_name || 'Route Details'}
        subtitle={format(new Date(route.route_date), 'EEEE, MMMM d, yyyy')}
        icon={<Navigation className="h-6 w-6 md:h-8 md:w-8 text-indigo-500" />}
        onBack={() => navigate('/power-washing/routes')}
        actions={
          <div className="flex gap-2">
            {route.status === 'planned' && (
              <Button onClick={() => updateStatusMutation.mutate('in_progress')}>
                <Play className="h-4 w-4 mr-2" />
                Start Route
              </Button>
            )}
            {route.status === 'in_progress' && (
              <Button 
                variant="outline" 
                className="border-green-500/30 text-green-500"
                onClick={() => updateStatusMutation.mutate('completed')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        }
      />

      {/* Route Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Route Summary</CardTitle>
            <Badge className={getStatusColor(route.status)}>
              {route.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{format(new Date(route.route_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="font-medium">{route.total_jobs || stops?.length || 0}</p>
              </div>
            </div>
            {route.estimated_duration_minutes && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Est. Duration</p>
                  <p className="font-medium">
                    {Math.floor(route.estimated_duration_minutes / 60)}h {route.estimated_duration_minutes % 60}m
                  </p>
                </div>
              </div>
            )}
            {route.total_distance_miles && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-medium">{route.total_distance_miles.toFixed(1)} miles</p>
                </div>
              </div>
            )}
            {route.assigned_crew && route.assigned_crew.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Crew</p>
                  <p className="font-medium">{route.assigned_crew.length} members</p>
                </div>
              </div>
            )}
          </div>
          {route.notes && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">{route.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Route Stops */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Route Stops
            </CardTitle>
            <Dialog open={isAddJobOpen} onOpenChange={setIsAddJobOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={route.status === 'completed'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Job
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Job to Route</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Select Job</Label>
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a job to add..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableJobs?.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.job_number} - {job.property_address || 'No address'} ({job.property_type || 'Unknown'})
                          </SelectItem>
                        ))}
                        {(!availableJobs || availableJobs.length === 0) && (
                          <SelectItem value="none" disabled>
                            No available jobs for this date
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddJobOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => selectedJobId && addStopMutation.mutate(selectedJobId)}
                      disabled={!selectedJobId || addStopMutation.isPending}
                    >
                      Add to Route
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingStops ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : stops && stops.length > 0 ? (
            <div className="space-y-3">
              {stops.map((stop) => (
                <div 
                  key={stop.id}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {stop.stop_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">
                        {stop.job?.property_address || 'No Address'}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {stop.job?.job_number || 'N/A'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {stop.job?.property_type || 'Unknown Property Type'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={stop.status} 
                      onValueChange={(value) => updateStopStatusMutation.mutate({ stopId: stop.id, status: value })}
                      disabled={route.status === 'completed'}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getStopStatusOptions().map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStopMutation.mutate(stop.id)}
                      disabled={route.status === 'completed'}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">No Stops Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add jobs to this route to start planning
              </p>
              <Button onClick={() => setIsAddJobOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Job
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </MobilePageContainer>
  );
}
