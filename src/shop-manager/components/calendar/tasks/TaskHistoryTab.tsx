import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  History,
  UserPlus,
  UserMinus,
  Clock,
  Package,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskHistoryTabProps {
  taskData: ReturnType<typeof import('@/hooks/useTaskData').useTaskData>;
}

export function TaskHistoryTab({ taskData }: TaskHistoryTabProps) {
  const { activities } = taskData;

  const getActivityIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('assigned')) return <UserPlus className="h-4 w-4" />;
    if (actionLower.includes('unassigned')) return <UserMinus className="h-4 w-4" />;
    if (actionLower.includes('clock')) return <Clock className="h-4 w-4" />;
    if (actionLower.includes('time')) return <Clock className="h-4 w-4" />;
    if (actionLower.includes('part')) return <Package className="h-4 w-4" />;
    if (actionLower.includes('note')) return <MessageSquare className="h-4 w-4" />;
    if (actionLower.includes('completed')) return <CheckCircle2 className="h-4 w-4" />;
    if (actionLower.includes('in-progress') || actionLower.includes('in progress')) {
      return <PlayCircle className="h-4 w-4" />;
    }
    if (actionLower.includes('status')) return <AlertCircle className="h-4 w-4" />;
    return <History className="h-4 w-4" />;
  };

  const getActivityColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('completed')) return 'text-green-600 bg-green-100';
    if (actionLower.includes('assigned')) return 'text-blue-600 bg-blue-100';
    if (actionLower.includes('unassigned')) return 'text-orange-600 bg-orange-100';
    if (actionLower.includes('clock in')) return 'text-green-600 bg-green-100';
    if (actionLower.includes('clock out')) return 'text-red-600 bg-red-100';
    if (actionLower.includes('part')) return 'text-purple-600 bg-purple-100';
    if (actionLower.includes('note')) return 'text-blue-600 bg-blue-100';
    return 'text-muted-foreground bg-muted';
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter out notes for history view (notes have their own tab)
  const historyActivities = activities.filter((a) => !a.is_note);

  return (
    <div className="space-y-4">
      {historyActivities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity yet</p>
            <p className="text-sm">Task activity will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {historyActivities.map((activity, index) => (
              <div key={activity.id} className="relative flex gap-4">
                {/* Icon */}
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${getActivityColor(
                    activity.action
                  )}`}
                >
                  {getActivityIcon(activity.action)}
                </div>

                {/* Content */}
                <Card className="flex-1">
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{activity.action}</p>
                        {activity.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{activity.notes}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(activity.user_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {activity.user_name || 'System'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
