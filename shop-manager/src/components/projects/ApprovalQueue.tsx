import { CheckCircle, XCircle, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProjectBudgets } from '@/hooks/useProjectBudgets';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { PROJECT_TYPES } from '@/types/projectBudget';

export function ApprovalQueue() {
  const { projects, approveProject, updateProject } = useProjectBudgets();
  
  const pendingApproval = projects?.filter(p => 
    p.status === 'planning' && p.requires_approval
  ) || [];

  const handleApprove = async (id: string) => {
    await approveProject.mutateAsync(id);
  };

  const handleReject = async (id: string) => {
    await updateProject.mutateAsync({
      id,
      updates: { status: 'cancelled' },
    });
  };

  if (pendingApproval.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium">All Caught Up!</h3>
        <p className="text-muted-foreground">No projects pending approval.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Projects Pending Approval</h3>
        <Badge variant="secondary">{pendingApproval.length} pending</Badge>
      </div>

      {pendingApproval.map((project) => {
        const typeConfig = PROJECT_TYPES.find(t => t.value === project.project_type);

        return (
          <Card key={project.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{project.project_code}</Badge>
                    <Badge variant="secondary">{typeConfig?.label || project.project_type}</Badge>
                    {project.priority === 'high' && <Badge className="bg-orange-500">High Priority</Badge>}
                    {project.priority === 'critical' && <Badge variant="destructive">Critical</Badge>}
                  </div>
                  <CardTitle className="text-xl">{project.project_name}</CardTitle>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(project.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(project.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="font-medium">{formatCurrency(project.original_budget)}</p>
                  </div>
                </div>
                {project.contingency_amount > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contingency</p>
                    <p className="font-medium">
                      {formatCurrency(project.contingency_amount)} ({project.contingency_percent}%)
                    </p>
                  </div>
                )}
                {project.planned_start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Planned Start</p>
                      <p className="font-medium">{format(new Date(project.planned_start_date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                )}
                {project.planned_end_date && (
                  <div>
                    <p className="text-xs text-muted-foreground">Planned End</p>
                    <p className="font-medium">{format(new Date(project.planned_end_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
