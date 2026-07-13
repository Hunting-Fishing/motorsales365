
import React from "react";
import { RepairTask } from "@/types/repairPlan";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash, ChevronUp, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface RepairTaskItemProps {
  task: RepairTask;
  index: number;
  isExpanded: boolean;
  technicians: string[];
  onUpdateTask: (task: RepairTask) => void;
  onRemoveTask: (taskId: string) => void;
  onToggleExpand: (taskId: string) => void;
}

export function RepairTaskItem({
  task,
  index,
  isExpanded,
  technicians,
  onUpdateTask,
  onRemoveTask,
  onToggleExpand
}: RepairTaskItemProps) {
  const handleTaskUpdate = (field: keyof RepairTask, value: any) => {
    onUpdateTask({
      ...task,
      [field]: value
    });
  };

  return (
    <Card key={task.id} className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center p-4 border-b bg-muted/20">
          <div className="flex-1">
            <div className="flex items-center">
              <Checkbox 
                id={`task-completed-${task.id}`}
                checked={task.completed} 
                onCheckedChange={(checked) => {
                  handleTaskUpdate('completed', !!checked);
                }}
                className="mr-2"
              />
              <span className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                {task.description || `Task ${index + 1}`}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleExpand(task.id)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveTask(task.id)}
            >
              <Trash className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4 space-y-4">
            <div>
              <Label htmlFor={`task-description-${task.id}`}>Description</Label>
              <Input
                id={`task-description-${task.id}`}
                value={task.description}
                onChange={(e) => handleTaskUpdate('description', e.target.value)}
                placeholder="Task description"
                className="mt-1"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`task-hours-${task.id}`}>Estimated Hours</Label>
                <Input
                  id={`task-hours-${task.id}`}
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={task.estimatedHours}
                  onChange={(e) => handleTaskUpdate('estimatedHours', parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor={`task-technician-${task.id}`}>Assigned To</Label>
                <Select
                  value={task.assignedTo || ""}
                  onValueChange={(value) => handleTaskUpdate('assignedTo', value || undefined)}
                >
                  <SelectTrigger id={`task-technician-${task.id}`} className="mt-1">
                    <SelectValue placeholder="Assign technician" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech} value={tech}>
                        {tech}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor={`task-notes-${task.id}`}>Notes</Label>
              <Textarea
                id={`task-notes-${task.id}`}
                value={task.notes || ""}
                onChange={(e) => handleTaskUpdate('notes', e.target.value)}
                placeholder="Task notes"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
