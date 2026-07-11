import { useState } from 'react';
import { Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { ProjectPhase } from '@/types/projectBudget';

interface PhaseListProps {
  phases: ProjectPhase[];
  projectId: string;
}

const PHASE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'delayed', label: 'Delayed', color: 'bg-red-500' },
];

export function PhaseList({ phases, projectId }: PhaseListProps) {
  const { updatePhase, deletePhase } = useProjectDetails(projectId);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [deletePhaseId, setDeletePhaseId] = useState<string | null>(null);
  const [editingProgress, setEditingProgress] = useState<{ id: string; value: number } | null>(null);

  const toggleExpanded = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const handleStatusChange = async (phaseId: string, newStatus: string) => {
    await updatePhase.mutateAsync({
      id: phaseId,
      updates: { 
        status: newStatus,
        ...(newStatus === 'in_progress' && { actual_start: new Date().toISOString().split('T')[0] }),
        ...(newStatus === 'completed' && { 
          actual_end: new Date().toISOString().split('T')[0],
          percent_complete: 100,
        }),
      },
    });
  };

  const handleProgressSave = async () => {
    if (!editingProgress) return;
    await updatePhase.mutateAsync({
      id: editingProgress.id,
      updates: { percent_complete: editingProgress.value },
    });
    setEditingProgress(null);
  };

  const handleDelete = async () => {
    if (!deletePhaseId) return;
    await deletePhase.mutateAsync(deletePhaseId);
    setDeletePhaseId(null);
  };

  if (phases.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No phases defined. Add phases to break down this project.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {phases.map((phase, index) => {
        const isExpanded = expandedPhases.has(phase.id);
        const statusConfig = PHASE_STATUSES.find(s => s.value === phase.status);
        const spentPercent = phase.phase_budget > 0 
          ? (phase.actual_spent / phase.phase_budget) * 100 
          : 0;

        return (
          <Card key={phase.id}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(phase.id)}>
              <CollapsibleTrigger asChild>
                <CardContent className="py-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Phase {index + 1}
                        </span>
                        <Badge className={statusConfig?.color || 'bg-gray-500'}>
                          {statusConfig?.label || phase.status}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-foreground">{phase.phase_name}</h4>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(phase.actual_spent)} / {formatCurrency(phase.phase_budget)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {phase.percent_complete}% complete
                        </div>
                      </div>
                      <Progress value={phase.percent_complete} className="w-24 h-2" />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    {/* Timeline */}
                    <div>
                      <h5 className="text-sm font-medium mb-2">Timeline</h5>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {phase.planned_start && (
                          <p>Planned: {format(new Date(phase.planned_start), 'MMM d')} - {phase.planned_end && format(new Date(phase.planned_end), 'MMM d')}</p>
                        )}
                        {phase.actual_start && (
                          <p>Actual: {format(new Date(phase.actual_start), 'MMM d')} - {phase.actual_end && format(new Date(phase.actual_end), 'MMM d')}</p>
                        )}
                      </div>
                    </div>

                    {/* Budget */}
                    <div>
                      <h5 className="text-sm font-medium mb-2">Budget</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Budgeted</span>
                          <span>{formatCurrency(phase.phase_budget)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spent</span>
                          <span>{formatCurrency(phase.actual_spent)}</span>
                        </div>
                        <Progress value={spentPercent} className="h-2" />
                      </div>
                    </div>

                    {/* Progress & Actions */}
                    <div>
                      <h5 className="text-sm font-medium mb-2">Progress</h5>
                      {editingProgress?.id === phase.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={editingProgress.value}
                            onChange={(e) => setEditingProgress({
                              id: phase.id,
                              value: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                            })}
                            className="w-20 h-8"
                          />
                          <span className="text-sm">%</span>
                          <Button size="sm" onClick={handleProgressSave}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingProgress(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span 
                            className="text-sm cursor-pointer hover:underline"
                            onClick={() => setEditingProgress({ id: phase.id, value: phase.percent_complete })}
                          >
                            {phase.percent_complete}% complete
                          </span>
                          <div className="flex items-center gap-1">
                            {phase.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(phase.id, phase.status === 'pending' ? 'in_progress' : 'completed')}
                              >
                                {phase.status === 'pending' ? 'Start' : 'Complete'}
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeletePhaseId(phase.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {phase.description && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">{phase.description}</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      <AlertDialog open={!!deletePhaseId} onOpenChange={() => setDeletePhaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Phase?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this phase and any associated cost items.
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
