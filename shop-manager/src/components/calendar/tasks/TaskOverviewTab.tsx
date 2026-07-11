import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Clock, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface TaskOverviewTabProps {
  taskData: ReturnType<typeof import('@/hooks/useTaskData').useTaskData>;
  onClose: () => void;
}

export function TaskOverviewTab({ taskData, onClose }: TaskOverviewTabProps) {
  const {
    task,
    assignees,
    totalTimeMinutes,
    totalPartsCost,
    updateStatus,
    completeTask,
  } = taskData;

  if (!task) return null;

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatus(newStatus);
  };

  const handleComplete = () => {
    completeTask();
    onClose();
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {task.description || 'No description provided.'}
          </p>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                {task.start_time ? format(new Date(task.start_time), 'MMM d, yyyy') : 'Not set'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Time:</span>
              <span className="font-medium">
                {task.all_day
                  ? 'All Day'
                  : task.start_time
                  ? format(new Date(task.start_time), 'h:mm a')
                  : 'Not set'}
              </span>
            </div>
          </CardContent>
        </Card>

        {task.location && (
          <Card className="col-span-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{task.location}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Control */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={task.status || 'pending'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Pending
                </div>
              </SelectItem>
              <SelectItem value="in-progress">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  In Progress
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Completed
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{assignees.length}</p>
              <p className="text-xs text-muted-foreground">Assignees</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatTime(totalTimeMinutes)}</p>
              <p className="text-xs text-muted-foreground">Time Logged</p>
            </div>
            <div>
              <p className="text-2xl font-bold">${totalPartsCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Parts Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        {task.status !== 'completed' && (
          <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );
}
