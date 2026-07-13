import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, AlertTriangle, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { useMilestoneNotifications, UpcomingMilestone } from '@/hooks/useMilestoneNotifications';
import { format, formatDistanceToNow } from 'date-fns';

const statusConfig: Record<UpcomingMilestone['status'], { label: string; color: string; icon: any }> = {
  overdue: { label: 'Overdue', color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
  today: { label: 'Today', color: 'bg-amber-500 text-white', icon: Clock },
  upcoming_1d: { label: 'Tomorrow', color: 'bg-orange-500 text-white', icon: Clock },
  upcoming_3d: { label: '3 Days', color: 'bg-yellow-500 text-black', icon: Calendar },
  upcoming_7d: { label: '7 Days', color: 'bg-blue-500 text-white', icon: Calendar },
  future: { label: 'Future', color: 'bg-muted text-muted-foreground', icon: Calendar },
};

interface UpcomingMilestonesProps {
  onSelectProject?: (projectId: string) => void;
  limit?: number;
  compact?: boolean;
}

export function UpcomingMilestones({ onSelectProject, limit, compact = false }: UpcomingMilestonesProps) {
  const { upcomingMilestones, isLoading, overdueCount, approachingCount } = useMilestoneNotifications();

  const displayMilestones = limit ? upcomingMilestones.slice(0, limit) : upcomingMilestones;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayMilestones.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">No upcoming milestones in the next 7 days</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Milestones
            {(overdueCount > 0 || approachingCount > 0) && (
              <div className="flex gap-1">
                {overdueCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {overdueCount} overdue
                  </Badge>
                )}
                {approachingCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {approachingCount} upcoming
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={compact ? 'h-[200px]' : 'h-[300px]'}>
          <div className="space-y-3">
            {displayMilestones.map((milestone) => {
              const config = statusConfig[milestone.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={milestone.phase_id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${config.color}`}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {milestone.project_code}
                      </Badge>
                      <span className="text-sm font-medium truncate">
                        {milestone.phase_name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {milestone.project_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(milestone.milestone_date), 'MMM d, yyyy')}
                      </span>
                      <span className="text-xs">•</span>
                      <span className={`text-xs font-medium ${
                        milestone.status === 'overdue' ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {milestone.status === 'overdue' 
                          ? `${Math.abs(milestone.days_until)} days overdue`
                          : milestone.status === 'today'
                          ? 'Due today'
                          : `${milestone.days_until} day${milestone.days_until !== 1 ? 's' : ''} left`
                        }
                      </span>
                    </div>
                  </div>
                  {onSelectProject && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectProject(milestone.project_id)}
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
