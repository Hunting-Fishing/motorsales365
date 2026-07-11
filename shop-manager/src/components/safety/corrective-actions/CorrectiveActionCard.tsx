import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import type { CorrectiveAction } from '@/hooks/useCorrectiveActions';

interface Props {
  action: CorrectiveAction;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500'
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  completed: 'bg-green-500',
  verified: 'bg-purple-500',
  closed: 'bg-gray-500'
};

export function CorrectiveActionCard({ action, onEdit, onDelete, onStatusChange }: Props) {
  const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== 'closed';

  return (
    <Card className={isOverdue ? 'border-red-500' : ''}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg">{action.title}</CardTitle>
          <div className="flex gap-2">
            <Badge className={priorityColors[action.priority]}>{action.priority}</Badge>
            <Badge className={statusColors[action.status]}>{action.status.replace('_', ' ')}</Badge>
            <Badge variant="outline">{action.action_type}</Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('in_progress')}>Mark In Progress</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('completed')}>Mark Completed</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{action.description || 'No description'}</p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          {action.due_date && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
              <Clock className="h-4 w-4" />
              Due: {format(new Date(action.due_date), 'MMM d, yyyy')}
            </span>
          )}
          {action.assignee && (
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {action.assignee.first_name} {action.assignee.last_name}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
