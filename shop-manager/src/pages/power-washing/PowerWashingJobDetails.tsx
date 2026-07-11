import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Camera,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Edit,
  User,
  Building2,
  Droplets,
  Trash2,
  FileText,
  DollarSign,
  Phone,
  Mail
} from 'lucide-react';
import { usePowerWashingJobs, useUpdatePowerWashingJob, PowerWashingJob } from '@/hooks/usePowerWashing';
import { JobPhotoUploader } from '@/components/power-washing/JobPhotoUploader';
import { TimeClockWidget } from '@/components/power-washing/TimeClockWidget';
import { ChemicalUsageLogger } from '@/components/power-washing/ChemicalUsageLogger';
import { JobCostingTab } from '@/components/power-washing/JobCostingTab';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Play },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: AlertTriangle },
};

const STATUS_FLOW = ['pending', 'scheduled', 'in_progress', 'completed'];

export default function PowerWashingJobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: jobs, isLoading } = usePowerWashingJobs();
  const updateJob = useUpdatePowerWashingJob();
  
  const [notes, setNotes] = useState('');

  const job = jobs?.find(j => j.id === id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested job could not be found.</p>
            <Button onClick={() => navigate('/power-washing/jobs')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const currentStatusIndex = STATUS_FLOW.indexOf(job.status);

  const handleStatusChange = async (newStatus: string) => {
    const updates: Partial<PowerWashingJob> & { id: string } = {
      id: job.id,
      status: newStatus,
    };

    if (newStatus === 'in_progress' && !job.actual_start_time) {
      updates.actual_start_time = new Date().toISOString();
    }
    if (newStatus === 'completed') {
      updates.actual_end_time = new Date().toISOString();
    }

    try {
      await updateJob.mutateAsync(updates);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleComplete = () => {
    handleStatusChange('completed');
  };

  const handlePhotosUpdate = async (type: 'before' | 'after', photos: string[]) => {
    if (!job) return;
    const field = type === 'before' ? 'before_photos' : 'after_photos';
    await updateJob.mutateAsync({ id: job.id, [field]: photos });
    queryClient.invalidateQueries({ queryKey: ['power-washing-jobs'] });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing/jobs')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{job.job_number}</h1>
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
              {job.priority === 'urgent' && (
                <Badge variant="destructive">Urgent</Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/power-washing/jobs/${job.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {job.status !== 'completed' && job.status !== 'cancelled' && (
              <>
                {job.status === 'in_progress' ? (
                  <Button onClick={handleComplete}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Job
                  </Button>
                ) : (
                  <Button onClick={() => handleStatusChange(STATUS_FLOW[currentStatusIndex + 1] || 'completed')}>
                    Move to {STATUS_CONFIG[STATUS_FLOW[currentStatusIndex + 1]]?.label || 'Complete'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Progress */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {STATUS_FLOW.map((status, index) => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              const isActive = job.status === status;
              const isPast = currentStatusIndex > index;
              return (
                <React.Fragment key={status}>
                  <div 
                    className={`flex items-center gap-2 cursor-pointer transition-colors ${
                      isActive ? 'text-primary' : isPast ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                    onClick={() => job.status !== 'completed' && job.status !== 'cancelled' && handleStatusChange(status)}
                  >
                    <div className={`p-2 rounded-full ${
                      isActive ? 'bg-primary/10' : isPast ? 'bg-green-500/10' : 'bg-muted'
                    }`}>
                      {isPast ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className="hidden sm:block font-medium">{config.label}</span>
                  </div>
                  {index < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${isPast ? 'bg-green-500' : 'bg-muted'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
              <TabsTrigger value="time">Time Tracking</TabsTrigger>
              <TabsTrigger value="chemicals">Chemicals</TabsTrigger>
              <TabsTrigger value="costing">Costing</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Property Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Property Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Property Type</p>
                    <p className="font-medium capitalize">{job.property_type?.replace('_', ' ') || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Square Footage</p>
                    <p className="font-medium">{job.square_footage?.toLocaleString() || '—'} sq ft</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Address</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="font-medium">
                        {job.property_address || 'No address'}
                        {job.property_city && `, ${job.property_city}`}
                        {job.property_state && `, ${job.property_state}`}
                        {job.property_zip && ` ${job.property_zip}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Schedule Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Date</p>
                    <p className="font-medium">
                      {job.scheduled_date ? format(new Date(job.scheduled_date), 'EEEE, MMMM d, yyyy') : 'Not scheduled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {job.scheduled_time_start && job.scheduled_time_end
                        ? `${job.scheduled_time_start} - ${job.scheduled_time_end}`
                        : 'Not set'}
                    </p>
                  </div>
                  {job.actual_start_time && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Actual Start</p>
                        <p className="font-medium">{format(new Date(job.actual_start_time), 'MMM d, h:mm a')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Actual End</p>
                        <p className="font-medium">
                          {job.actual_end_time 
                            ? format(new Date(job.actual_end_time), 'MMM d, h:mm a')
                            : 'In progress...'}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Special Instructions */}
              {job.special_instructions && (
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-5 w-5" />
                      Special Instructions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{job.special_instructions}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Before Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JobPhotoUploader
                      jobId={job.id}
                      photoType="before"
                      existingPhotos={job.before_photos || []}
                      onPhotosUpdate={(photos) => handlePhotosUpdate('before', photos)}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      After Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JobPhotoUploader
                      jobId={job.id}
                      photoType="after"
                      existingPhotos={job.after_photos || []}
                      onPhotosUpdate={(photos) => handlePhotosUpdate('after', photos)}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="time" className="mt-4">
              <TimeClockWidget
                jobId={job.id}
                shopId={job.shop_id}
                onTimeUpdate={() => queryClient.invalidateQueries({ queryKey: ['power-washing-jobs'] })}
              />
            </TabsContent>

            <TabsContent value="chemicals" className="mt-4">
              <ChemicalUsageLogger
                jobId={job.id}
                shopId={job.shop_id}
                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['power-washing-chemicals'] })}
              />
            </TabsContent>

            <TabsContent value="costing" className="mt-4">
              <JobCostingTab
                jobId={job.id}
                quotedPrice={job.quoted_price}
                finalPrice={job.final_price}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-4">
              {job.customer_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{job.customer_notes}</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Internal Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap mb-4">{job.internal_notes || 'No notes yet'}</p>
                  <Textarea
                    placeholder="Add a note..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    className="mt-2" 
                    size="sm"
                    disabled={!notes.trim()}
                    onClick={async () => {
                      await updateJob.mutateAsync({
                        id: job.id,
                        internal_notes: job.internal_notes 
                          ? `${job.internal_notes}\n\n[${format(new Date(), 'MMM d, h:mm a')}]\n${notes}`
                          : `[${format(new Date(), 'MMM d, h:mm a')}]\n${notes}`
                      });
                      setNotes('');
                    }}
                  >
                    Add Note
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pricing Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quoted Price</span>
                <span className="font-semibold">${job.quoted_price?.toLocaleString() || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Final Price</span>
                <span className="font-semibold">${job.final_price?.toLocaleString() || '—'}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit</span>
                  <div className="text-right">
                    <span className="font-semibold">${job.deposit_amount?.toLocaleString() || '0'}</span>
                    <Badge 
                      className={`ml-2 ${job.deposit_paid ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}
                    >
                      {job.deposit_paid ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              </div>
              {job.status === 'completed' && (
                <Button className="w-full mt-4">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Crew Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Assigned Crew
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.assigned_crew && job.assigned_crew.length > 0 ? (
                <div className="space-y-2">
                  {job.assigned_crew.map((crewId, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm">Crew Member</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No crew assigned yet</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Assign Crew
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Phone className="h-4 w-4 mr-2" />
                Call Customer
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="h-4 w-4 mr-2" />
                Get Directions
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Cancel Job
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
