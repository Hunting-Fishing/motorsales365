import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  WifiOff,
  RefreshCw,
  Cloud
} from 'lucide-react';
import { useTechnicianTasks, type TechnicianTask } from '@/hooks/useTechnicianTasks';
import { useTechnicianOfflineStorage } from '@/hooks/useTechnicianOfflineStorage';
import { usePWA } from '@/hooks/usePWA';
import { TechnicianTaskCard } from '@/components/technician/TechnicianTaskCard';
import { TaskDetailsSheet } from '@/components/technician/TaskDetailsSheet';
import { QuickHazardReport } from '@/components/technician/QuickHazardReport';
import { SyncQueuePanel } from '@/components/technician/SyncQueuePanel';
import { cn } from '@/lib/utils';

export default function TechnicianPortal() {
  const [selectedTask, setSelectedTask] = useState<TechnicianTask | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const {
    tasks,
    loading,
    isOffline,
    fetchTasks,
    startTask,
    completeTask,
    blockTask,
    todaysTasks,
    pendingTasks,
    inProgressTasks,
    blockedTasks
  } = useTechnicianTasks();

  const { pendingCount, syncStatus } = useTechnicianOfflineStorage();

  const handleViewDetails = (task: TechnicianTask) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const handleStart = (task: TechnicianTask) => {
    startTask(task.id);
  };

  const handleComplete = (task: TechnicianTask, notes?: string) => {
    completeTask(task.id, notes);
  };

  const handleBlock = (task: TechnicianTask, reason: string) => {
    blockTask(task.id, reason);
  };

  const renderTaskList = (taskList: TechnicianTask[], emptyMessage: string) => {
    if (taskList.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {taskList.map(task => (
          <TechnicianTaskCard
            key={task.id}
            task={task}
            onStart={() => handleStart(task)}
            onComplete={() => handleComplete(task)}
            onBlock={() => handleBlock(task, 'Blocked - needs attention')}
            onViewDetails={() => handleViewDetails(task)}
          />
        ))}
      </div>
    );
  };

  return (
    <MobileLayout 
      title="My Tasks"
      rightAction={
        <div className="flex items-center gap-2">
          <SyncQueuePanel />
          <Button 
            variant="ghost" 
            size="icon"
            onClick={fetchTasks}
            disabled={loading || isOffline}
          >
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          </Button>
        </div>
      }
    >
      {/* Offline Status Banner */}
      {isOffline && (
        <Card className="mb-4 border-orange-500 bg-orange-500/10">
          <CardContent className="p-3 flex items-center gap-3">
            <WifiOff className="h-5 w-5 text-orange-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Offline Mode Active
              </p>
              <p className="text-xs text-muted-foreground">
                Changes will sync when online
                {pendingCount > 0 && ` (${pendingCount} pending)`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{inProgressTasks.length}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{blockedTasks.length}</div>
            <div className="text-xs text-muted-foreground">Blocked</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Hazard Report Button */}
      <QuickHazardReport />

      {/* Task Tabs */}
      <Tabs defaultValue="today" className="mt-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="today" className="text-xs">
            Today
            {todaysTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {todaysTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs">
            Active
            {inProgressTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                {inProgressTasks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Queue
          </TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs">
            Blocked
            {blockedTasks.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {blockedTasks.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-380px)] mt-4">
          <TabsContent value="today" className="m-0">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading tasks...</p>
              </div>
            ) : (
              renderTaskList(todaysTasks, "No tasks for today!")
            )}
          </TabsContent>

          <TabsContent value="active" className="m-0">
            {renderTaskList(inProgressTasks, "No active tasks. Start one from your queue!")}
          </TabsContent>

          <TabsContent value="pending" className="m-0">
            {renderTaskList(pendingTasks, "No pending tasks in queue")}
          </TabsContent>

          <TabsContent value="blocked" className="m-0">
            {renderTaskList(blockedTasks, "No blocked tasks")}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Task Details Sheet */}
      <TaskDetailsSheet
        task={selectedTask}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStart={() => selectedTask && handleStart(selectedTask)}
        onComplete={(notes) => selectedTask && handleComplete(selectedTask, notes)}
        onBlock={(reason) => selectedTask && handleBlock(selectedTask, reason)}
      />
    </MobileLayout>
  );
}
