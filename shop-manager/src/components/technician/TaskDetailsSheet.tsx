import React, { useState } from 'react';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Wrench,
  User,
  Calendar,
  Timer,
  FileText,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TechnicianTask } from '@/hooks/useTechnicianTasks';
import { format } from 'date-fns';

interface TaskDetailsSheetProps {
  task: TechnicianTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
  onComplete: (notes?: string) => void;
  onBlock: (reason: string) => void;
}

const priorityConfig = {
  urgent: { color: 'bg-red-500', label: 'Urgent' },
  high: { color: 'bg-orange-500', label: 'High' },
  medium: { color: 'bg-yellow-500', label: 'Medium' },
  low: { color: 'bg-green-500', label: 'Low' }
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-muted-foreground', label: 'Pending' },
  in_progress: { icon: Play, color: 'text-blue-500', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  blocked: { icon: AlertTriangle, color: 'text-red-500', label: 'Blocked' }
};

export function TaskDetailsSheet({
  task,
  open,
  onOpenChange,
  onStart,
  onComplete,
  onBlock
}: TaskDetailsSheetProps) {
  const [completionNotes, setCompletionNotes] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [showBlockInput, setShowBlockInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!task) return null;

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const StatusIcon = status.icon;

  const handleComplete = async () => {
    setSubmitting(true);
    await onComplete(completionNotes);
    setCompletionNotes('');
    setSubmitting(false);
    onOpenChange(false);
  };

  const handleBlock = async () => {
    if (!blockReason.trim()) return;
    setSubmitting(true);
    await onBlock(blockReason);
    setBlockReason('');
    setShowBlockInput(false);
    setSubmitting(false);
    onOpenChange(false);
  };

  const handleStart = async () => {
    setSubmitting(true);
    await onStart();
    setSubmitting(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
        <SheetHeader className="text-left">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl">{task.title}</SheetTitle>
              <SheetDescription className="mt-1">
                Work Order #{task.workOrderId.slice(0, 8)}
              </SheetDescription>
            </div>
            <div className={cn("w-2 h-2 rounded-full mt-2", priority.color)} />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Priority */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={cn("text-sm", status.color)}>
              <StatusIcon className="w-4 h-4 mr-1" />
              {status.label}
            </Badge>
            <Badge variant="secondary">
              {priority.label} Priority
            </Badge>
          </div>

          <Separator />

          {/* Task Details */}
          <div className="space-y-4">
            {task.equipmentName && (
              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Equipment</p>
                  <p className="text-sm text-muted-foreground">
                    {task.equipmentName}
                    {task.assetNumber && ` (${task.assetNumber})`}
                  </p>
                </div>
              </div>
            )}

            {task.customerName && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Customer</p>
                  <p className="text-sm text-muted-foreground">{task.customerName}</p>
                </div>
              </div>
            )}

            {task.dueDate && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(task.dueDate), 'PPP')}
                  </p>
                </div>
              </div>
            )}

            {task.estimatedHours && (
              <div className="flex items-start gap-3">
                <Timer className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Estimated Time</p>
                  <p className="text-sm text-muted-foreground">{task.estimatedHours} hours</p>
                </div>
              </div>
            )}

            {task.description && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Completion Notes (for in-progress tasks) */}
          {task.status === 'in_progress' && (
            <div className="space-y-2">
              <Label htmlFor="completion-notes">Completion Notes</Label>
              <Textarea
                id="completion-notes"
                placeholder="Add notes about the work performed..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Block Reason Input */}
          {showBlockInput && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="block-reason">Why is this blocked?</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowBlockInput(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                id="block-reason"
                placeholder="Describe the issue preventing progress..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={2}
              />
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleBlock}
                disabled={!blockReason.trim() || submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Mark as Blocked
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          {!showBlockInput && (
            <div className="space-y-3">
              {task.status === 'pending' && (
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={handleStart}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  Start This Task
                </Button>
              )}
              
              {task.status === 'in_progress' && (
                <>
                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={handleComplete}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                    )}
                    Complete Task
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => setShowBlockInput(true)}
                  >
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Report Blocker
                  </Button>
                </>
              )}
              
              {task.status === 'blocked' && (
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={handleStart}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  Resume Task
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
