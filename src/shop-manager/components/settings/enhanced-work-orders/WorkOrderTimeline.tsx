import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  Settings,
  MessageSquare,
  Phone,
  FileText,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useWorkOrderActivities } from '@/hooks/work-orders/useWorkOrderActivities';

const getActivityConfig = (action: string) => {
  switch (action.toLowerCase()) {
    case 'created':
      return {
        icon: FileText,
        title: 'Work Order Created',
        color: 'text-blue-600 bg-blue-50',
        priority: 'normal'
      };
    case 'assigned':
      return {
        icon: User,
        title: 'Technician Assigned',
        color: 'text-green-600 bg-green-50',
        priority: 'normal'
      };
    case 'status_updated':
      return {
        icon: Settings,
        title: 'Status Updated',
        color: 'text-orange-600 bg-orange-50',
        priority: 'normal'
      };
    case 'completed':
      return {
        icon: CheckCircle,
        title: 'Work Order Completed',
        color: 'text-green-600 bg-green-50',
        priority: 'normal'
      };
    case 'customer_communication':
      return {
        icon: MessageSquare,
        title: 'Customer Communication',
        color: 'text-purple-600 bg-purple-50',
        priority: 'low'
      };
    case 'overdue_alert':
      return {
        icon: AlertTriangle,
        title: 'Overdue Alert',
        color: 'text-red-600 bg-red-50',
        priority: 'urgent'
      };
    default:
      return {
        icon: Settings,
        title: 'Work Order Updated',
        color: 'text-yellow-600 bg-yellow-50',
        priority: 'normal'
      };
  }
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

export function WorkOrderTimeline() {
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('today');
  const { activities, loading, error, refetch } = useWorkOrderActivities(20);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-lg">
        <AlertTriangle className="h-4 w-4" />
        <span>Failed to load activities: {error}</span>
        <button onClick={refetch} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.action.toLowerCase().includes(filter);
  });

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Activity Timeline</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="work_order_created">Work Orders Created</SelectItem>
              <SelectItem value="technician_assigned">Assignments</SelectItem>
              <SelectItem value="status_updated">Status Updates</SelectItem>
              <SelectItem value="work_order_completed">Completions</SelectItem>
              <SelectItem value="customer_communication">Communications</SelectItem>
              <SelectItem value="overdue_alert">Overdue Alerts</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Activity ({filteredActivities.length})</span>
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Real-time Updates
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>
            
            {/* Timeline items */}
            <div className="space-y-6">
              {filteredActivities.map((activity, index) => {
                const config = getActivityConfig(activity.action);
                const Icon = config.icon;
                const workOrderNumber = activity.work_order?.work_order_number || `WO-${activity.work_order_id?.slice(0, 8)}`;
                const customerName = activity.work_order?.customer 
                  ? `${activity.work_order.customer.first_name} ${activity.work_order.customer.last_name}`.trim()
                  : 'Unknown Customer';
                
                return (
                  <div key={activity.id} className="relative flex items-start gap-4">
                    {/* Timeline dot */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full border-4 border-background flex items-center justify-center ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium">{config.title}</h4>
                            <Badge className={priorityColors[config.priority as keyof typeof priorityColors]}>
                              {config.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {activity.action} for {workOrderNumber} - {customerName}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {activity.user_name || 'System'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTimeAgo(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-4">
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Load more */}
            <div className="text-center pt-6">
              <Button variant="outline">
                Load More Activities
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">23</div>
            <div className="text-sm text-muted-foreground">Created Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">18</div>
            <div className="text-sm text-muted-foreground">Completed Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">12</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">3</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}