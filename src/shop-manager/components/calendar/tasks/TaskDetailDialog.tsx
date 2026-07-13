import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTaskData } from '@/hooks/useTaskData';
import { TaskOverviewTab } from './TaskOverviewTab';
import { TaskAssigneesTab } from './TaskAssigneesTab';
import { TaskNotesTab } from './TaskNotesTab';
import { TaskTimeEntriesTab } from './TaskTimeEntriesTab';
import { TaskPartsTab } from './TaskPartsTab';
import { TaskHistoryTab } from './TaskHistoryTab';
import {
  CheckCircle2,
  Clock,
  Users,
  MessageSquare,
  Package,
  History,
  FileText,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskDetailDialogProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailDialog({ taskId, isOpen, onClose }: TaskDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const taskData = useTaskData(taskId);

  const { task, assignees, timeEntries, parts, totalTimeMinutes, totalPartsCost, isLoading } = taskData;

  if (!taskId || isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in-progress': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold truncate">
                {task?.title || 'Task'}
              </DialogTitle>
              {task?.start_time && (
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(task.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={getPriorityColor(task?.priority || 'low')}>
                {task?.priority || 'low'}
              </Badge>
              <Badge className={getStatusColor(task?.status || 'pending')}>
                {task?.status || 'pending'}
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{assignees.length} assignee{assignees.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTime(totalTimeMinutes)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span>{parts.length} part{parts.length !== 1 ? 's' : ''}</span>
            </div>
            {totalPartsCost > 0 && (
              <div className="flex items-center gap-1">
                <span>${totalPartsCost.toFixed(2)}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0 grid grid-cols-6 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="assignees" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Assignees</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Time</span>
            </TabsTrigger>
            <TabsTrigger value="parts" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Parts</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="overview" className="m-0 h-full">
              <TaskOverviewTab taskData={taskData} onClose={onClose} />
            </TabsContent>
            <TabsContent value="assignees" className="m-0 h-full">
              <TaskAssigneesTab taskData={taskData} />
            </TabsContent>
            <TabsContent value="notes" className="m-0 h-full">
              <TaskNotesTab taskData={taskData} />
            </TabsContent>
            <TabsContent value="time" className="m-0 h-full">
              <TaskTimeEntriesTab taskData={taskData} />
            </TabsContent>
            <TabsContent value="parts" className="m-0 h-full">
              <TaskPartsTab taskData={taskData} />
            </TabsContent>
            <TabsContent value="history" className="m-0 h-full">
              <TaskHistoryTab taskData={taskData} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
