
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Settings } from "lucide-react";
import { RepairPlan, RepairTask } from "@/types/repairPlan";

interface RepairPlanTasksCardProps {
  repairPlan: RepairPlan;
  onTaskStatusChange: (taskId: string, completed: boolean) => void;
}

export function RepairPlanTasksCard({ 
  repairPlan, 
  onTaskStatusChange 
}: RepairPlanTasksCardProps) {
  const tasksCompleted = repairPlan.tasks.filter(task => task.completed).length;
  const totalTasks = repairPlan.tasks.length;
  const progress = totalTasks ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Repair Tasks ({tasksCompleted}/{totalTasks})
          </div>
          <Badge className={progress === 100 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
            {progress}% Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {repairPlan.tasks.length === 0 ? (
            <div className="text-center p-6 border border-dashed rounded-md text-muted-foreground">
              No tasks added to this repair plan.
            </div>
          ) : (
            repairPlan.tasks.map((task) => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onTaskStatusChange={onTaskStatusChange} 
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskItemProps {
  task: RepairTask;
  onTaskStatusChange: (taskId: string, completed: boolean) => void;
}

function TaskItem({ task, onTaskStatusChange }: TaskItemProps) {
  return (
    <div className="border rounded-md p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="mt-1 mr-2">
            <Checkbox 
              checked={task.completed} 
              onCheckedChange={(checked) => {
                onTaskStatusChange(task.id, !!checked);
              }}
            />
          </div>
          <div>
            <h4 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
              {task.description}
            </h4>
            <div className="flex flex-wrap items-center mt-1 gap-2">
              <Badge variant="outline" className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {task.estimatedHours} hours
              </Badge>
              {task.assignedTo && (
                <Badge variant="outline" className="flex items-center">
                  Assigned to: {task.assignedTo}
                </Badge>
              )}
            </div>
            {task.notes && (
              <p className="mt-2 text-sm text-muted-foreground">{task.notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
