import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Briefcase, Calendar, DollarSign, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { useProjectBudgets } from '@/hooks/useProjectBudgets';
import { useAllProjectResources } from '@/hooks/useProjectResources';
import { formatCurrency } from '@/lib/utils';
import { format, differenceInDays, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';

interface ProjectCapacityPanelProps {
  onProjectClick?: (projectId: string) => void;
}

export function ProjectCapacityPanel({ onProjectClick }: ProjectCapacityPanelProps) {
  const { projects, isLoading: projectsLoading } = useProjectBudgets();
  const { resources, isLoading: resourcesLoading } = useAllProjectResources();

  const capacityData = useMemo(() => {
    if (!projects?.length) return null;

    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const activeProjects = projects.filter(p => 
      p.status === 'in_progress' || p.status === 'approved'
    );

    // Calculate monthly resource allocation
    const monthlyAllocations = resources?.filter((r: any) => {
      if (!r.start_date || !r.end_date) return true;
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      return (
        (isAfter(start, monthStart) || isBefore(start, monthEnd)) &&
        (isAfter(end, monthStart) || isBefore(end, monthEnd))
      );
    }) || [];

    const totalMonthlyHours = monthlyAllocations.reduce((sum: number, r: any) => 
      sum + (r.planned_hours || 0), 0
    );

    // Unique resources this month
    const uniqueResourceIds = new Set(monthlyAllocations.map((r: any) => r.resource_id));
    const monthlyCapacity = uniqueResourceIds.size * 160; // 160 hours per resource per month

    // Budget metrics
    const totalBudget = activeProjects.reduce((sum, p) => 
      sum + (p.current_budget || p.original_budget || 0), 0
    );
    const totalSpent = activeProjects.reduce((sum, p) => sum + (p.actual_spent || 0), 0);

    // Projects at risk
    const atRiskProjects = activeProjects.filter(p => {
      if (!p.planned_end_date) return false;
      const daysRemaining = differenceInDays(new Date(p.planned_end_date), today);
      const budget = p.current_budget || p.original_budget || 0;
      const spentPercent = budget > 0 ? (p.actual_spent || 0) / budget : 0;
      return daysRemaining < 30 && spentPercent > 0.8;
    });

    // Upcoming milestones (simplified - just projects ending soon)
    const upcomingDeadlines = activeProjects
      .filter(p => p.planned_end_date)
      .map(p => ({
        id: p.id,
        name: p.project_name,
        date: p.planned_end_date!,
        daysUntil: differenceInDays(new Date(p.planned_end_date!), today),
      }))
      .filter(p => p.daysUntil > 0 && p.daysUntil <= 60)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return {
      activeProjects: activeProjects.length,
      totalBudget,
      totalSpent,
      budgetUtilization: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      totalMonthlyHours,
      monthlyCapacity,
      capacityUtilization: monthlyCapacity > 0 ? (totalMonthlyHours / monthlyCapacity) * 100 : 0,
      resourceCount: uniqueResourceIds.size,
      atRiskProjects,
      upcomingDeadlines,
    };
  }, [projects, resources]);

  const isLoading = projectsLoading || resourcesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading capacity data...
        </CardContent>
      </Card>
    );
  }

  if (!capacityData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No active projects
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs">Active Projects</span>
            </div>
            <div className="text-2xl font-bold">{capacityData.activeProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Resources</span>
            </div>
            <div className="text-2xl font-bold">{capacityData.resourceCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Capacity Used</span>
            </div>
            <div className={`text-2xl font-bold ${capacityData.capacityUtilization > 100 ? 'text-destructive' : ''}`}>
              {capacityData.capacityUtilization.toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Budget Used</span>
            </div>
            <div className="text-2xl font-bold">{capacityData.budgetUtilization.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monthly Capacity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{capacityData.totalMonthlyHours}h allocated</span>
              <span>{capacityData.monthlyCapacity}h available</span>
            </div>
            <Progress 
              value={Math.min(capacityData.capacityUtilization, 100)} 
              className={`h-3 ${capacityData.capacityUtilization > 100 ? '[&>div]:bg-destructive' : ''}`}
            />
            {capacityData.capacityUtilization > 100 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Over capacity by {(capacityData.capacityUtilization - 100).toFixed(0)}%
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* At Risk Projects */}
      {capacityData.atRiskProjects.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Projects at Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {capacityData.atRiskProjects.map(project => (
                <div 
                  key={project.id}
                  className="flex items-center justify-between p-2 bg-destructive/10 rounded cursor-pointer hover:bg-destructive/20"
                  onClick={() => onProjectClick?.(project.id)}
                >
                  <span className="font-medium text-sm">{project.project_name}</span>
                  <Badge variant="destructive">
                    {project.planned_end_date && 
                      `${differenceInDays(new Date(project.planned_end_date), new Date())} days left`
                    }
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {capacityData.upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {capacityData.upcomingDeadlines.slice(0, 5).map(deadline => (
                <div 
                  key={deadline.id}
                  className="flex items-center justify-between p-2 border border-border rounded cursor-pointer hover:bg-muted/50"
                  onClick={() => onProjectClick?.(deadline.id)}
                >
                  <span className="text-sm">{deadline.name}</span>
                  <Badge variant={deadline.daysUntil <= 14 ? 'secondary' : 'outline'}>
                    {deadline.daysUntil} days
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
