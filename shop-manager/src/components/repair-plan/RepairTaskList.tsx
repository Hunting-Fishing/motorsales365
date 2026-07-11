
import { useState } from "react";
import { RepairTask } from "@/types/repairPlan";
import { RepairTaskItem } from "./task/RepairTaskItem";
import { RepairTaskEmptyState } from "./task/RepairTaskEmptyState";

interface RepairTaskListProps {
  tasks: RepairTask[];
  onUpdateTask: (task: RepairTask) => void;
  onRemoveTask: (taskId: string) => void;
  technicians: string[];
}

export function RepairTaskList({ 
  tasks, 
  onUpdateTask, 
  onRemoveTask,
  technicians
}: RepairTaskListProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  if (tasks.length === 0) {
    return <RepairTaskEmptyState />;
  }
  
  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };
  
  return (
    <div className="space-y-3">
      {tasks.map((task, index) => (
        <RepairTaskItem
          key={task.id}
          task={task}
          index={index}
          isExpanded={expandedTaskId === task.id}
          technicians={technicians}
          onUpdateTask={onUpdateTask}
          onRemoveTask={onRemoveTask}
          onToggleExpand={toggleTaskExpanded}
        />
      ))}
    </div>
  );
}
