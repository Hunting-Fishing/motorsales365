import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Phone, 
  Clock, 
  Camera,
  CheckCircle,
  Play,
  Navigation,
  ArrowLeft,
  ChevronRight,
  Droplets,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function PowerWashingFieldView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: todaysJobs, isLoading } = useQuery({
    queryKey: ['power-washing-field-jobs'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('power_washing_jobs')
        .select('*, customers(first_name, last_name, phone)')
        .eq('scheduled_date', today)
        .in('status', ['scheduled', 'in_progress'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const updateJobStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, string> = { status };
      if (status === 'in_progress') {
        updates.actual_start_time = new Date().toISOString();
      } else if (status === 'completed') {
        updates.actual_end_time = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('power_washing_jobs')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-field-jobs'] });
      toast.success('Job status updated');
    },
  });

  const openNavigation = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, '_blank');
  };

  const callCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/10 text-blue-500';
      case 'in_progress': return 'bg-amber-500/10 text-amber-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const activeJob = todaysJobs?.find(j => j.id === activeJobId);
  const customerName = activeJob?.customers 
    ? `${activeJob.customers.first_name} ${activeJob.customers.last_name}` 
    : 'Customer';
  const customerPhone = activeJob?.customers?.phone;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/power-washing')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">Field View</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(), 'EEE, MMM d')}
          </div>
        </div>
      </div>

      {/* Active Job Detail View */}
      {activeJob ? (
        <div className="p-4">
          <Button 
            variant="ghost" 
            className="mb-4"
            onClick={() => setActiveJobId(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>

          <Card className="border-border mb-4">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{activeJob.job_number}</h2>
                  <Badge className={getStatusColor(activeJob.status)}>
                    {activeJob.status.replace('_', ' ')}
                  </Badge>
                </div>
                {activeJob.priority === 'urgent' && (
                  <Badge variant="destructive">URGENT</Badge>
                )}
              </div>

              <div className="space-y-4">
                {/* Customer Info */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{customerName}</p>
                    {customerPhone && (
                      <p className="text-sm text-muted-foreground">{customerPhone}</p>
                    )}
                  </div>
                  {customerPhone && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => callCustomer(customerPhone)}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Address */}
                <div 
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer"
                  onClick={() => openNavigation(activeJob.property_address)}
                >
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{activeJob.property_address}</p>
                    <p className="text-sm text-muted-foreground">{activeJob.property_type}</p>
                  </div>
                  <Navigation className="h-5 w-5 text-primary" />
                </div>

                {/* Schedule */}
                {activeJob.scheduled_date && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Scheduled Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(activeJob.scheduled_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Estimated SQFT */}
                {activeJob.square_footage && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Droplets className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Estimated Area</p>
                      <p className="text-sm text-muted-foreground">{activeJob.square_footage.toLocaleString()} sq ft</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {activeJob.customer_notes && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{activeJob.customer_notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {activeJob.status === 'scheduled' && (
              <Button 
                className="h-16 text-lg"
                onClick={() => updateJobStatus.mutate({ id: activeJob.id, status: 'in_progress' })}
              >
                <Play className="h-6 w-6 mr-2" />
                Start Job
              </Button>
            )}
            {activeJob.status === 'in_progress' && (
              <Button 
                className="h-16 text-lg bg-green-600 hover:bg-green-700"
                onClick={() => updateJobStatus.mutate({ id: activeJob.id, status: 'completed' })}
              >
                <CheckCircle className="h-6 w-6 mr-2" />
                Complete
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-16"
              onClick={() => navigate(`/power-washing/jobs/${activeJob.id}/edit`)}
            >
              <Camera className="h-6 w-6 mr-2" />
              Photos & Details
            </Button>
            <Button 
              variant="outline" 
              className="h-16"
              onClick={() => openNavigation(activeJob.property_address)}
            >
              <Navigation className="h-6 w-6 mr-2" />
              Navigate
            </Button>
          </div>
        </div>
      ) : (
        /* Job List View */
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Today's Jobs</h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : todaysJobs && todaysJobs.length > 0 ? (
            <div className="space-y-3">
              {todaysJobs.map((job, index) => (
                <Card 
                  key={job.id} 
                  className={`border-border cursor-pointer active:scale-[0.98] transition-transform ${
                    job.status === 'in_progress' ? 'ring-2 ring-amber-500' : ''
                  }`}
                  onClick={() => setActiveJobId(job.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{job.job_number}</span>
                            <Badge className={getStatusColor(job.status)} variant="outline">
                              {job.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {job.property_address}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <Droplets className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <h3 className="font-semibold mb-1">No Jobs Today</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have any jobs scheduled for today
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
