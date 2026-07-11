import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Wrench, DollarSign, Package, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateMaintenanceForecast } from '@/services/maintenance/predictiveMaintenanceService';
import { format } from 'date-fns';
import { useShopId } from '@/hooks/useShopId';
import { getMaintenanceActivities } from '@/services/maintenance/maintenanceActivityService';
import { CreateScheduleDialog } from '@/components/maintenance/CreateScheduleDialog';
import { EditScheduleDialog } from '@/components/maintenance/EditScheduleDialog';
import { BudgetDashboard } from '@/components/maintenance/BudgetDashboard';
import { MaintenanceCalendar } from '@/components/maintenance/MaintenanceCalendar';
import { MaintenanceHistory } from '@/components/maintenance/MaintenanceHistory';
import { ActivityAnalytics } from '@/components/maintenance/ActivityAnalytics';
import { ActivityExport } from '@/components/maintenance/ActivityExport';
import { ScheduleActions } from '@/components/maintenance/ScheduleActions';

export default function MaintenancePlanning() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const { shopId } = useShopId();

  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ['maintenance-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_schedules')
        .select('*')
        .order('next_due_date', { ascending: true })
        .limit(50);
      if (error) throw error;
      return data;
    }
  });

  const { data: predictions } = useQuery({
    queryKey: ['maintenance-predictions'],
    queryFn: generateMaintenanceForecast
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['maintenance-activities', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      return getMaintenanceActivities(shopId);
    },
    enabled: !!shopId,
  });

  const upcomingCount = schedules?.filter(s => {
    const daysUntil = Math.floor((new Date(s.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  }).length || 0;

  const overdueCount = schedules?.filter(s => new Date(s.next_due_date) < new Date()).length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Planning</h1>
          <p className="text-muted-foreground">
            Predictive maintenance scheduling with automatic parts ordering
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Due in 30 Days</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{upcomingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AI Predictions</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{predictions?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="schedules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading schedules...</p>
              ) : schedules?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No maintenance schedules found</p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules?.slice(0, 10).map(schedule => {
                    const daysUntil = Math.floor((new Date(schedule.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysUntil < 0;
                    const isDueSoon = daysUntil <= 7 && daysUntil >= 0;
                    
                    return (
                      <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{schedule.title}</h4>
                          <p className="text-sm text-muted-foreground">{schedule.maintenance_type}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {format(new Date(schedule.next_due_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {isOverdue ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}
                          </div>
                          {schedule.estimated_cost && (
                            <p className="text-sm text-muted-foreground">${schedule.estimated_cost}</p>
                          )}
                        </div>
                        <ScheduleActions
                          schedule={schedule}
                          onEdit={() => {
                            setSelectedSchedule(schedule);
                            setEditDialogOpen(true);
                          }}
                          onComplete={refetch}
                          onDelete={refetch}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <MaintenanceCalendar />
        </TabsContent>

        <TabsContent value="budget">
          <BudgetDashboard />
        </TabsContent>

        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {predictions?.length === 0 ? (
                <p className="text-muted-foreground">No predictions available yet. Create maintenance schedules to get AI-powered forecasts.</p>
              ) : (
                <div className="space-y-3">
                  {predictions?.map((prediction, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{prediction.maintenanceType}</h4>
                          <p className="text-sm text-muted-foreground">{prediction.assetName}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Predicted due: {format(new Date(prediction.predictedDueDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{prediction.daysUntilDue} days</div>
                          <p className="text-xs text-muted-foreground">
                            {(prediction.confidenceLevel * 100).toFixed(0)}% confidence
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex justify-end">
              <ActivityExport activities={activities} />
            </div>
            <Tabs defaultValue="timeline" className="w-full">
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline">
                <MaintenanceHistory />
              </TabsContent>
              <TabsContent value="analytics">
                <ActivityAnalytics activities={activities} />
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateScheduleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />
      
      {selectedSchedule && (
        <EditScheduleDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={refetch}
          schedule={selectedSchedule}
        />
      )}
    </div>
  );
}
