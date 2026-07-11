import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Wrench,
  ChevronRight,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TechnicianTask } from '@/hooks/useTechnicianTasks';

interface TechnicianTaskCardProps {
  task: TechnicianTask;
  onStart: () => void;
  onComplete: () => void;
  onBlock: () => void;
  onViewDetails: () => void;
}

const priorityConfig = {
  urgent: { color: 'bg-red-500', label: 'Urgent', textColor: 'text-red-700' },
  high: { color: 'bg-orange-500', label: 'High', textColor: 'text-orange-700' },
  medium: { color: 'bg-yellow-500', label: 'Medium', textColor: 'text-yellow-700' },
  low: { color: 'bg-green-500', label: 'Low', textColor: 'text-green-700' }
};

const statusConfig = {
  pending: { icon: Clock, color: 'bg-muted', label: 'Pending' },
  in_progress: { icon: Play, color: 'bg-blue-500', label: 'In Progress' },
  completed: { icon: CheckCircle2, color: 'bg-green-500', label: 'Completed' },
  blocked: { icon: AlertTriangle, color: 'bg-red-500', label: 'Blocked' }
};

export function TechnicianTaskCard({
  task,
  onStart,
  onComplete,
  onBlock,
  onViewDetails
}: TechnicianTaskCardProps) {
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];
  const StatusIcon = status.icon;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all active:scale-[0.98]",
        task.status === 'in_progress' && "ring-2 ring-primary"
      )}
    >
      {/* Priority indicator */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", priority.color)} />
      
      <CardContent className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="secondary" className={cn("text-xs", priority.textColor)}>
                {priority.label}
              </Badge>
            </div>
            <h3 className="font-semibold text-base truncate">{task.title}</h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0"
            onClick={onViewDetails}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Equipment info */}
        {task.equipmentName && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Wrench className="h-4 w-4" />
            <span className="truncate">{task.equipmentName}</span>
            {task.assetNumber && (
              <Badge variant="outline" className="text-xs">
                {task.assetNumber}
              </Badge>
            )}
          </div>
        )}

        {/* Customer */}
        {task.customerName && (
          <p className="text-sm text-muted-foreground mt-1">
            Customer: {task.customerName}
          </p>
        )}

        {/* Time estimate */}
        {task.estimatedHours && (
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span>{task.estimatedHours}h estimated</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {task.status === 'pending' && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={onStart}
            >
              <Play className="h-4 w-4 mr-1" />
              Start Task
            </Button>
          )}
          
          {task.status === 'in_progress' && (
            <>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={onComplete}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Complete
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={onBlock}
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {task.status === 'blocked' && (
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1"
              onClick={onStart}
            >
              <Play className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
