import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  MapPin, 
  Calendar, 
  Plus,
  User,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UnassignedJob {
  id: string;
  job_number: string;
  property_address: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  assigned_crew: any[] | null;
  customer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
  } | null;
}

interface UnassignedJobsListProps {
  jobs: UnassignedJob[];
  onAddToRoute: (jobId: string) => void;
  selectedDate: string;
  isLoading?: boolean;
  isAddingToRoute?: boolean;
}

export function UnassignedJobsList({ 
  jobs, 
  onAddToRoute, 
  selectedDate,
  isLoading,
  isAddingToRoute 
}: UnassignedJobsListProps) {
  // Filter jobs for selected date
  const jobsForDate = jobs.filter(job => job.scheduled_date === selectedDate);
  const otherJobs = jobs.filter(job => job.scheduled_date !== selectedDate);

  if (isLoading) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Loading Unassigned Jobs...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card className="border-dashed border-2 border-green-500/30 bg-green-500/5">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">All jobs are assigned to routes!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCustomerDisplay = (job: UnassignedJob) => {
    if (!job.customer) return 'Unknown Customer';
    if (job.customer.company) return job.customer.company;
    return `${job.customer.first_name || ''} ${job.customer.last_name || ''}`.trim() || 'Unknown';
  };

  const JobCard = ({ job, isToday }: { job: UnassignedJob; isToday: boolean }) => (
    <div 
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-colors",
        isToday 
          ? "bg-amber-500/10 border-amber-500/30" 
          : "bg-muted/50 border-border"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm font-semibold text-primary">
            {job.job_number}
          </span>
          <Badge variant="outline" className="text-xs">
            {job.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="truncate">{getCustomerDisplay(job)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{job.property_address || 'No address'}</span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(job.scheduled_date), 'MMM d')}
          </div>
          {job.scheduled_time && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {job.scheduled_time}
            </div>
          )}
        </div>
      </div>
      <Button 
        size="sm" 
        variant="outline"
        className="ml-3 shrink-0"
        onClick={() => onAddToRoute(job.id)}
        disabled={isAddingToRoute}
      >
        <Plus className="h-4 w-4 mr-1" />
        {isAddingToRoute ? 'Adding...' : 'Add to Route'}
      </Button>
    </div>
  );

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Unassigned Jobs
          <Badge variant="secondary" className="ml-2">
            {jobs.length} total
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          These scheduled jobs need to be added to a route
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Jobs for selected date */}
        {jobsForDate.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              {format(new Date(selectedDate), 'EEEE, MMM d')} ({jobsForDate.length})
            </h4>
            <div className="space-y-2">
              {jobsForDate.map(job => (
                <JobCard key={job.id} job={job} isToday={true} />
              ))}
            </div>
          </div>
        )}

        {/* Other jobs in the week */}
        {otherJobs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">
              Other Days This Week ({otherJobs.length})
            </h4>
            <div className="space-y-2">
              {otherJobs.slice(0, 3).map(job => (
                <JobCard key={job.id} job={job} isToday={false} />
              ))}
              {otherJobs.length > 3 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  +{otherJobs.length - 3} more jobs
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
