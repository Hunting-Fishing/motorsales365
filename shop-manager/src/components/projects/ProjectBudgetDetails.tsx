import { useState } from 'react';
import { ArrowLeft, Edit, Trash2, CheckCircle, XCircle, Plus, Users, Wrench, History, FileDown, Paperclip, MessageSquare, Save, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProjectDetails } from '@/hooks/useProjectBudgets';
import { useProjectBudgets } from '@/hooks/useProjectBudgets';
import { useProjectResources } from '@/hooks/useProjectResources';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { PROJECT_STATUSES, PROJECT_TYPES } from '@/types/projectBudget';
import { PhaseList } from './PhaseList';
import { PhaseTimeline } from './PhaseTimeline';
import { EarnedValueAnalysis } from './EarnedValueAnalysis';
import { CriticalPathAnalysis } from './CriticalPathAnalysis';
import { CostItemList } from './CostItemList';
import { ChangeOrderList } from './ChangeOrderList';
import { ProjectResourcesList } from './ProjectResourcesList';
import { BudgetSnapshotList } from './BudgetSnapshotList';
import { CreatePhaseDialog } from './CreatePhaseDialog';
import { CreateCostItemDialog } from './CreateCostItemDialog';
import { CreateChangeOrderDialog } from './CreateChangeOrderDialog';
import { CreateSnapshotDialog } from './CreateSnapshotDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectPdfExport } from './ProjectPdfExport';
import { ProjectCsvExport } from './ProjectCsvExport';
import { SaveAsTemplateDialog } from './SaveAsTemplateDialog';
import { ProjectActivityFeed } from './ProjectActivityFeed';
import { ProjectAttachments } from './ProjectAttachments';
import { MilestoneNotificationSettings } from './MilestoneNotificationSettings';
import { UpcomingMilestones } from './UpcomingMilestones';

interface ProjectBudgetDetailsProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectBudgetDetails({ projectId, onBack }: ProjectBudgetDetailsProps) {
  const { project, phases, costItems, changeOrders, snapshots, isLoading, createSnapshot } = useProjectDetails(projectId);
  const { resources } = useProjectResources(projectId);
  const { approveProject, deleteProject, updateProject } = useProjectBudgets();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPhaseDialog, setShowPhaseDialog] = useState(false);
  const [showCostItemDialog, setShowCostItemDialog] = useState(false);
  const [showChangeOrderDialog, setShowChangeOrderDialog] = useState(false);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  if (isLoading || !project) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const budget = project.current_budget || project.original_budget || 0;
  const spent = project.actual_spent || 0;
  const committed = project.committed_amount || 0;
  const remaining = budget - spent - committed;
  const spentPercent = budget > 0 ? (spent / budget) * 100 : 0;

  const statusConfig = PROJECT_STATUSES.find(s => s.value === project.status);
  const typeConfig = PROJECT_TYPES.find(t => t.value === project.project_type);

  const handleApprove = async () => {
    await approveProject.mutateAsync(projectId);
  };

  const handleDelete = async () => {
    await deleteProject.mutateAsync(projectId);
    onBack();
  };

  const handleStartProject = async () => {
    await updateProject.mutateAsync({
      id: projectId,
      updates: {
        status: 'in_progress',
        actual_start_date: new Date().toISOString().split('T')[0],
      },
    });
  };

  const handleCompleteProject = async () => {
    await updateProject.mutateAsync({
      id: projectId,
      updates: {
        status: 'completed',
        actual_end_date: new Date().toISOString().split('T')[0],
      },
    });
  };

  const pendingChangeOrders = changeOrders?.filter(co => co.status === 'pending') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{project.project_code}</Badge>
              <Badge className={statusConfig?.color || 'bg-gray-500'}>
                {statusConfig?.label || project.status}
              </Badge>
              {project.priority === 'critical' && (
                <Badge variant="destructive">Critical</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mt-1">{project.project_name}</h1>
            <p className="text-muted-foreground">{typeConfig?.label || project.project_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ProjectPdfExport project={{...project, phases, cost_items: costItems, change_orders: changeOrders}} />
          <ProjectCsvExport project={{...project, phases, cost_items: costItems, change_orders: changeOrders}} />
          <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(true)}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
          {project.status === 'planning' && project.requires_approval && (
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
          {project.status === 'approved' && (
            <Button onClick={handleStartProject}>
              Start Project
            </Button>
          )}
          {project.status === 'in_progress' && (
            <Button onClick={handleCompleteProject} variant="outline">
              Mark Complete
            </Button>
          )}
          <Button variant="destructive" size="icon" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(budget)}</div>
            <p className="text-xs text-muted-foreground">
              Original: {formatCurrency(project.original_budget)}
              {project.contingency_amount > 0 && ` + ${formatCurrency(project.contingency_amount)} contingency`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(spent)}</div>
            <Progress value={spentPercent} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">{spentPercent.toFixed(1)}% of budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Committed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(committed)}</div>
            <p className="text-xs text-muted-foreground">Pending spend</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remaining < 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(remaining)}
            </div>
            <p className="text-xs text-muted-foreground">
              {remaining < 0 ? 'Over budget' : 'Available'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Summary */}
      {resources && resources.length > 0 && (() => {
        const totalPlannedHours = resources.reduce((acc, r) => acc + (r.planned_hours || 0), 0);
        const totalActualHours = resources.reduce((acc, r) => acc + (r.actual_hours || 0), 0);
        const totalPlannedCost = resources.reduce((acc, r) => acc + (r.planned_cost || 0), 0);
        const totalActualCost = resources.reduce((acc, r) => acc + (r.actual_cost || 0), 0);
        const timeVariance = totalPlannedHours > 0 ? ((totalActualHours - totalPlannedHours) / totalPlannedHours) * 100 : 0;
        const costVariance = totalPlannedCost > 0 ? ((totalActualCost - totalPlannedCost) / totalPlannedCost) * 100 : 0;
        const isTimeOver = timeVariance > 0;
        const isCostOver = costVariance > 0;

        return (
          <Card className="bg-muted/30">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Time:</span>
                    <span className={`font-medium ${isTimeOver ? 'text-destructive' : 'text-green-600'}`}>
                      {totalActualHours}h / {totalPlannedHours}h
                    </span>
                    <Badge variant={isTimeOver ? 'destructive' : 'secondary'} className="text-xs">
                      {isTimeOver ? '+' : ''}{timeVariance.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Labor Cost:</span>
                    <span className={`font-medium ${isCostOver ? 'text-destructive' : 'text-green-600'}`}>
                      {formatCurrency(totalActualCost)} / {formatCurrency(totalPlannedCost)}
                    </span>
                    <Badge variant={isCostOver ? 'destructive' : 'secondary'} className="text-xs">
                      {isCostOver ? '+' : ''}{costVariance.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Timeline */}
      {(project.planned_start_date || project.planned_end_date) && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Planned: </span>
                {project.planned_start_date && format(new Date(project.planned_start_date), 'MMM d, yyyy')}
                {project.planned_end_date && ` - ${format(new Date(project.planned_end_date), 'MMM d, yyyy')}`}
              </div>
              {project.actual_start_date && (
                <div>
                  <span className="text-muted-foreground">Actual: </span>
                  {format(new Date(project.actual_start_date), 'MMM d, yyyy')}
                  {project.actual_end_date && ` - ${format(new Date(project.actual_end_date), 'MMM d, yyyy')}`}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="phases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="phases">
            Phases ({phases?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="analysis">
            EV Analysis
          </TabsTrigger>
          <TabsTrigger value="critical-path">
            Critical Path
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Users className="h-4 w-4 mr-1" />
            Resources ({resources?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="costs">
            Cost Items ({costItems?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="changes" className="relative">
            Change Orders
            {pendingChangeOrders.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {pendingChangeOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="snapshots">
            <History className="h-4 w-4 mr-1" />
            Snapshots ({snapshots?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="attachments">
            <Paperclip className="h-4 w-4 mr-1" />
            Files
          </TabsTrigger>
          <TabsTrigger value="activity">
            <MessageSquare className="h-4 w-4 mr-1" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-1" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phases">
          <div className="space-y-4">
            <PhaseTimeline 
              phases={phases || []} 
              projectStart={project.planned_start_date || undefined}
              projectEnd={project.planned_end_date || undefined}
            />
            <div className="flex justify-end">
              <Button onClick={() => setShowPhaseDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Phase
              </Button>
            </div>
            <PhaseList phases={phases || []} projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <EarnedValueAnalysis project={project} phases={phases || []} />
        </TabsContent>

        <TabsContent value="critical-path">
          <CriticalPathAnalysis 
            phases={phases || []} 
            projectStart={project.planned_start_date || undefined}
            projectEnd={project.planned_end_date || undefined}
          />
        </TabsContent>

        <TabsContent value="resources">
          <ProjectResourcesList projectId={projectId} phases={phases} />
        </TabsContent>

        <TabsContent value="costs">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCostItemDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Cost Item
              </Button>
            </div>
            <CostItemList costItems={costItems || []} phases={phases || []} projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="changes">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowChangeOrderDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Change Order
              </Button>
            </div>
            <ChangeOrderList changeOrders={changeOrders || []} projectId={projectId} />
          </div>
        </TabsContent>

        <TabsContent value="snapshots">
          <BudgetSnapshotList 
            snapshots={snapshots || []}
            onCreateSnapshot={() => setShowSnapshotDialog(true)}
            isCreating={createSnapshot.isPending}
          />
        </TabsContent>

        <TabsContent value="attachments">
          <ProjectAttachments projectId={projectId} />
        </TabsContent>

        <TabsContent value="activity">
          <ProjectActivityFeed projectId={projectId} />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UpcomingMilestones />
            <MilestoneNotificationSettings />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreatePhaseDialog
        open={showPhaseDialog}
        onOpenChange={setShowPhaseDialog}
        projectId={projectId}
        existingPhases={phases || []}
      />

      <CreateCostItemDialog
        open={showCostItemDialog}
        onOpenChange={setShowCostItemDialog}
        projectId={projectId}
        phases={phases || []}
      />

      <CreateChangeOrderDialog
        open={showChangeOrderDialog}
        onOpenChange={setShowChangeOrderDialog}
        projectId={projectId}
        currentBudget={budget}
      />

      <CreateSnapshotDialog
        open={showSnapshotDialog}
        onOpenChange={setShowSnapshotDialog}
        onSubmit={(data) => createSnapshot.mutate({ snapshot_type: data.snapshot_type, notes: data.notes })}
        isLoading={createSnapshot.isPending}
      />

      <SaveAsTemplateDialog
        project={{...project, phases, cost_items: costItems, change_orders: changeOrders}}
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all its phases, cost items, and change orders.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
