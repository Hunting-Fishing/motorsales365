import { useMemo } from 'react';
import { Briefcase, TrendingUp, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import type { ProjectBudget } from '@/types/projectBudget';

interface ProjectSummaryWidgetProps {
  projects: ProjectBudget[];
  compact?: boolean;
}

export function ProjectSummaryWidget({ projects, compact = false }: ProjectSummaryWidgetProps) {
  const metrics = useMemo(() => {
    const activeProjects = projects.filter(p => 
      p.status === 'in_progress' || p.status === 'approved'
    );
    
    const totalBudget = projects.reduce((sum, p) => sum + (p.current_budget || p.original_budget || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (p.actual_spent || 0), 0);
    const totalCommitted = projects.reduce((sum, p) => sum + (p.committed_amount || 0), 0);
    
    // Projects over budget
    const overBudget = projects.filter(p => {
      const budget = p.current_budget || p.original_budget || 0;
      return (p.actual_spent || 0) > budget;
    });
    
    // Projects at risk (spending > 80% with < 50% complete time remaining)
    const atRisk = activeProjects.filter(p => {
      if (!p.planned_end_date) return false;
      const budget = p.current_budget || p.original_budget || 0;
      const spentPercent = budget > 0 ? ((p.actual_spent || 0) / budget) * 100 : 0;
      const daysRemaining = differenceInDays(new Date(p.planned_end_date), new Date());
      const totalDays = p.planned_start_date 
        ? differenceInDays(new Date(p.planned_end_date), new Date(p.planned_start_date))
        : 30;
      const timeRemainingPercent = totalDays > 0 ? (daysRemaining / totalDays) * 100 : 0;
      return spentPercent > 80 && timeRemainingPercent < 50;
    });
    
    // Pending approvals
    const pendingApproval = projects.filter(p => 
      p.status === 'planning' && p.requires_approval
    );
    
    const spentPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    
    return {
      total: projects.length,
      active: activeProjects.length,
      totalBudget,
      totalSpent,
      totalCommitted,
      remaining: totalBudget - totalSpent - totalCommitted,
      spentPercent,
      overBudget: overBudget.length,
      atRisk: atRisk.length,
      pendingApproval: pendingApproval.length,
      completed: projects.filter(p => p.status === 'completed').length,
    };
  }, [projects]);

  if (compact) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{metrics.active}</div>
                <div className="text-sm text-muted-foreground">Active Projects</div>
              </div>
            </div>
            <div className="flex gap-2">
              {metrics.atRisk > 0 && (
                <Badge variant="destructive">{metrics.atRisk} at risk</Badge>
              )}
              {metrics.pendingApproval > 0 && (
                <Badge variant="outline">{metrics.pendingApproval} pending</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active}</div>
            <p className="text-xs text-muted-foreground">of {metrics.total} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalBudget)}</div>
            <Progress value={metrics.spentPercent} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{metrics.spentPercent.toFixed(1)}% spent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.remaining < 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(metrics.remaining)}
            </div>
            <p className="text-xs text-muted-foreground">Available budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {metrics.atRisk > 0 && (
                <Badge variant="destructive" className="mr-1">{metrics.atRisk} at risk</Badge>
              )}
              {metrics.overBudget > 0 && (
                <Badge variant="destructive" className="mr-1">{metrics.overBudget} over budget</Badge>
              )}
              {metrics.pendingApproval > 0 && (
                <Badge variant="outline">{metrics.pendingApproval} pending approval</Badge>
              )}
              {metrics.atRisk === 0 && metrics.overBudget === 0 && metrics.pendingApproval === 0 && (
                <span className="text-sm text-muted-foreground">No alerts</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Budget</div>
              <div className="text-xl font-bold">{formatCurrency(metrics.totalBudget)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Spent</div>
              <div className="text-xl font-bold">{formatCurrency(metrics.totalSpent)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Committed</div>
              <div className="text-xl font-bold">{formatCurrency(metrics.totalCommitted)}</div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Budget Utilization</span>
              <span>{metrics.spentPercent.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(metrics.spentPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Spent: {formatCurrency(metrics.totalSpent)}</span>
              <span>Remaining: {formatCurrency(metrics.remaining)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
