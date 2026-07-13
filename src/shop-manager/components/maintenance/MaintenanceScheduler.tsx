import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, AlertTriangle, CheckCircle, Wrench, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaintenanceSchedules, MaintenanceSchedule } from '@/hooks/useMaintenanceSchedules';

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'text-destructive';
    case 'high': return 'text-orange-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-green-500';
    default: return 'text-muted-foreground';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'due_soon': return <Wrench className="h-4 w-4 text-blue-500" />;
    case 'overdue': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'completed': return 'default';
    case 'due_soon': return 'secondary';
    case 'overdue': return 'destructive';
    default: return 'outline';
  }
};

const formatStatus = (status: string) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function MaintenanceScheduler() {
  const { schedules, loading } = useMaintenanceSchedules();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredSchedules = schedules.filter(schedule => {
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || schedule.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const today = new Date().toISOString().split('T')[0];
  const todaysSchedules = schedules.filter(schedule => 
    schedule.next_service_date?.startsWith(today)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Today's Maintenance Tasks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaysSchedules.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {todaysSchedules.map((schedule) => (
                <Card key={schedule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(schedule.status)}
                      <div>
                        <h4 className="font-semibold">{schedule.schedule_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {schedule.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getPriorityColor(schedule.priority)}`}>
                        {schedule.priority.toUpperCase()}
                      </div>
                      {schedule.estimated_duration_hours && (
                        <div className="text-xs text-muted-foreground">
                          {schedule.estimated_duration_hours}h estimated
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No maintenance tasks scheduled for today
            </p>
          )}
        </CardContent>
      </Card>

      {/* All Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Maintenance Schedule</CardTitle>
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSchedules.length > 0 ? (
            <div className="space-y-4">
              {filteredSchedules.map((schedule) => (
                <Card key={schedule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(schedule.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{schedule.schedule_name}</h3>
                          <Badge variant={getStatusVariant(schedule.status)}>
                            {formatStatus(schedule.status)}
                          </Badge>
                          <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(schedule.priority)} bg-muted`}>
                            {schedule.priority}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {schedule.trigger_type === 'time-based' ? 'Time-based' : 
                           schedule.trigger_type === 'usage-based' ? 'Usage-based' : 'Time & Usage'}
                        </p>
                        {schedule.description && (
                          <p className="text-xs text-muted-foreground mt-1">{schedule.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {schedule.next_service_date && (
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(schedule.next_service_date).toLocaleDateString()}
                        </div>
                      )}
                      {schedule.estimated_duration_hours && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {schedule.estimated_duration_hours}h
                        </div>
                      )}
                      {schedule.assigned_technician && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <User className="h-3 w-3 mr-1" />
                          {schedule.assigned_technician}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No maintenance schedules found. Create your first schedule to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
