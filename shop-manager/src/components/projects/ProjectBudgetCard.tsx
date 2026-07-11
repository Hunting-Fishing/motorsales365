import { Calendar, DollarSign, TrendingUp, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/utils';
import { format, isPast, addDays, isWithinInterval } from 'date-fns';
import type { ProjectBudget } from '@/types/projectBudget';
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/types/projectBudget';
import { MilestoneAlertBadge } from './MilestoneAlertBadge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProjectBudgetCardProps {
  project: ProjectBudget;
  onClick: () => void;
}

export function ProjectBudgetCard({ project, onClick }: ProjectBudgetCardProps) {
  const budget = project.current_budget || project.original_budget || 0;
  const spent = project.actual_spent || 0;
  const committed = project.committed_amount || 0;
  const spentPercent = budget > 0 ? (spent / budget) * 100 : 0;
  const committedPercent = budget > 0 ? ((spent + committed) / budget) * 100 : 0;
  const isOverBudget = spent > budget;

  const statusConfig = PROJECT_STATUSES.find(s => s.value === project.status);
  const typeConfig = PROJECT_TYPES.find(t => t.value === project.project_type);

  // Fetch milestone alerts for this project
  const { data: milestoneAlerts } = useQuery({
    queryKey: ['project-milestone-alerts', project.id],
    queryFn: async () => {
      const today = new Date();
      const sevenDaysFromNow = addDays(today, 7);

      const { data, error } = await supabase
        .from('project_phases')
        .select('id, planned_end, status')
        .eq('project_id', project.id)
        .neq('status', 'completed')
        .not('planned_end', 'is', null);

      if (error) throw error;

      let overdueCount = 0;
      let approachingCount = 0;

      (data || []).forEach((phase) => {
        if (!phase.planned_end) return;
        const endDate = new Date(phase.planned_end);
        
        if (isPast(endDate) && phase.status !== 'completed') {
          overdueCount++;
        } else if (isWithinInterval(endDate, { start: today, end: sevenDaysFromNow })) {
          approachingCount++;
        }
      });

      return { overdueCount, approachingCount };
    },
  });

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {project.project_code}
              </Badge>
              <Badge className={statusConfig?.color || 'bg-gray-500'}>
                {statusConfig?.label || project.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground line-clamp-1">{project.project_name}</h3>
              {milestoneAlerts && (
                <MilestoneAlertBadge 
                  overdueCount={milestoneAlerts.overdueCount} 
                  approachingCount={milestoneAlerts.approachingCount} 
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{typeConfig?.label || project.project_type}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span className={isOverBudget ? 'text-destructive font-medium' : 'text-foreground'}>
              {formatCurrency(spent)} / {formatCurrency(budget)}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className="absolute h-full bg-muted-foreground/30 transition-all"
              style={{ width: `${Math.min(committedPercent, 100)}%` }}
            />
            <div 
              className={`absolute h-full transition-all ${isOverBudget ? 'bg-destructive' : 'bg-primary'}`}
              style={{ width: `${Math.min(spentPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{spentPercent.toFixed(0)}% spent</span>
            {committed > 0 && (
              <span>{formatCurrency(committed)} committed</span>
            )}
          </div>
        </div>

        {/* Timeline */}
        {(project.planned_start_date || project.planned_end_date) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {project.planned_start_date && format(new Date(project.planned_start_date), 'MMM d')}
              {project.planned_start_date && project.planned_end_date && ' - '}
              {project.planned_end_date && format(new Date(project.planned_end_date), 'MMM d, yyyy')}
            </span>
          </div>
        )}

        {/* Variance indicator */}
        {isOverBudget && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <TrendingUp className="h-3 w-3" />
            <span>{formatCurrency(spent - budget)} over budget</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
