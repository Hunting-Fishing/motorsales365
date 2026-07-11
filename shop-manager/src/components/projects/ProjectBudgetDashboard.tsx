import { useState } from 'react';
import { Plus, DollarSign, TrendingUp, Clock, AlertTriangle, GanttChart, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectBudgets } from '@/hooks/useProjectBudgets';
import { ProjectBudgetCard } from './ProjectBudgetCard';
import { CreateProjectDialog } from './CreateProjectDialog';
import { ProjectBudgetDetails } from './ProjectBudgetDetails';
import { ApprovalQueue } from './ApprovalQueue';
import { MultiYearTimeline } from './MultiYearTimeline';
import { ResourceUtilizationChart } from './ResourceUtilizationChart';
import { ProjectCapacityPanel } from './ProjectCapacityPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

export function ProjectBudgetDashboard() {
  const { projects, isLoading } = useProjectBudgets();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const activeProjects = projects?.filter(p => 
    ['planning', 'approved', 'in_progress'].includes(p.status)
  ) || [];

  const pendingApproval = projects?.filter(p => 
    p.status === 'planning' && p.requires_approval
  ) || [];

  const totalBudget = activeProjects.reduce((sum, p) => sum + (p.current_budget || p.original_budget || 0), 0);
  const totalSpent = activeProjects.reduce((sum, p) => sum + (p.actual_spent || 0), 0);
  const totalCommitted = activeProjects.reduce((sum, p) => sum + (p.committed_amount || 0), 0);
  const overBudgetProjects = activeProjects.filter(p => (p.actual_spent || 0) > (p.current_budget || p.original_budget || 0));

  if (selectedProjectId) {
    return (
      <ProjectBudgetDetails 
        projectId={selectedProjectId} 
        onBack={() => setSelectedProjectId(null)} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Budgets</h2>
          <p className="text-muted-foreground">Manage large-scale projects with hierarchical budgets</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              {activeProjects.length} active projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}% of budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Committed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommitted)}</div>
            <p className="text-xs text-muted-foreground">
              Pending spend
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overBudgetProjects.length}</div>
            <p className="text-xs text-muted-foreground">
              Projects exceeding budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Projects</TabsTrigger>
          <TabsTrigger value="timeline">
            <GanttChart className="h-4 w-4 mr-1" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="capacity">
            <BarChart3 className="h-4 w-4 mr-1" />
            Capacity
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Users className="h-4 w-4 mr-1" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="approvals" className="relative">
            Approvals
            {pendingApproval.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {pendingApproval.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : projects?.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No projects yet. Create your first project to get started.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects?.map(project => (
                <ProjectBudgetCard
                  key={project.id}
                  project={project}
                  onClick={() => setSelectedProjectId(project.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <div className="h-[600px]">
            <MultiYearTimeline onProjectSelect={setSelectedProjectId} />
          </div>
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <ProjectCapacityPanel onProjectClick={setSelectedProjectId} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourceUtilizationChart />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map(project => (
              <ProjectBudgetCard
                key={project.id}
                project={project}
                onClick={() => setSelectedProjectId(project.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalQueue />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects?.filter(p => p.status === 'completed').map(project => (
              <ProjectBudgetCard
                key={project.id}
                project={project}
                onClick={() => setSelectedProjectId(project.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <CreateProjectDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />
    </div>
  );
}
