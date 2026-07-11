
import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RepairTask } from "@/types/repairPlan";
import { RepairTaskList } from "../RepairTaskList";

interface RepairPlanTasksSectionProps {
  tasks: RepairTask[];
  onAddTask: () => void;
  onUpdateTask: (task: RepairTask) => void;
  onRemoveTask: (taskId: string) => void;
  technicians: string[];
}

export function RepairPlanTasksSection({
  tasks,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  technicians
}: RepairPlanTasksSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Repair Tasks</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAddTask}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>
      
      <RepairTaskList 
        tasks={tasks}
        onUpdateTask={onUpdateTask}
        onRemoveTask={onRemoveTask}
        technicians={technicians}
      />
    </div>
  );
}
