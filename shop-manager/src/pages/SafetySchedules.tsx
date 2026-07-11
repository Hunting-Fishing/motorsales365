import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSafetyReminders } from '@/hooks/useSafetyReminders';
import { useSafetySchedules, CreateScheduleData } from '@/hooks/useSafetySchedules';
import { useInspectionAssignments } from '@/hooks/useInspectionAssignments';
import { AssignInspectionDialog } from '@/components/safety/AssignInspectionDialog';
import { CreateVehicleScheduleDialog } from '@/components/safety/CreateVehicleScheduleDialog';
import { QRCodeScanner } from '@/components/safety/qr/QRCodeScanner';
import { AutoWorkOrderRulesPanel } from '@/components/safety/workorder/AutoWorkOrderRulesPanel';
import { OfflineStatusBar } from '@/components/safety/offline/OfflineStatusBar';
import { 
  CalendarClock, 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Shield,
  Wrench,
  FileCheck,
  Award,
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  Car,
  Users,
  QrCode,
  Settings
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const frequencyLabels: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  hours_based: 'Hours-Based'
};

const typeIcons: Record<string, React.ElementType> = {
  inspection: FileCheck,
  certification: Award,
  dvir: Wrench,
  equipment: Shield,
  vehicle_maintenance: Car
};

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
};

export default function SafetySchedules() {
  const navigate = useNavigate();
  const { 
    loading: remindersLoading, 
    reminders, 
    getOverdueReminders,
    getDueTodayReminders,
    getUpcomingReminders,
    getCriticalReminders
  } = useSafetyReminders();

  const {
    loading: schedulesLoading,
    schedules,
    toggleSchedule,
    markCompleted,
    createSchedule,
    deleteSchedule,
    refetch: refetchSchedules
  } = useSafetySchedules();

  const {
    loading: assignmentsLoading,
    assignments,
    getTodayAssignments,
    getMissedAssignments,
    refetch: refetchAssignments
  } = useInspectionAssignments();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<{ id: string; name: string } | null>(null);
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState<CreateScheduleData>({
    schedule_name: '',
    schedule_type: 'daily_inspection',
    frequency: 'daily',
    next_due_date: new Date().toISOString().split('T')[0]
  });

  const loading = remindersLoading || schedulesLoading || assignmentsLoading;
  const overdue = getOverdueReminders();
  const dueToday = getDueTodayReminders();
  const upcoming = getUpcomingReminders();
  const critical = getCriticalReminders();
  const todayAssignments = getTodayAssignments();
  const missedAssignments = getMissedAssignments();

  // Filter vehicle maintenance schedules
  const vehicleSchedules = schedules.filter(s => s.schedule_type === 'vehicle_maintenance' || s.vehicle_id);
  const regularSchedules = schedules.filter(s => s.schedule_type !== 'vehicle_maintenance' && !s.vehicle_id);

  const handleAddSchedule = async () => {
    if (!newSchedule.schedule_name) return;
    
    setAddingSchedule(true);
    await createSchedule(newSchedule);
    setAddingSchedule(false);
    setShowAddDialog(false);
    setNewSchedule({
      schedule_name: '',
      schedule_type: 'daily_inspection',
      frequency: 'daily',
      next_due_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleAssignStaff = (scheduleId: string, scheduleName: string) => {
    setSelectedSchedule({ id: scheduleId, name: scheduleName });
    setShowAssignDialog(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Safety Schedules & Reminders | Safety</title>
        <meta name="description" content="Manage safety inspection schedules and track upcoming compliance reminders" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-primary" />
              Schedules & Reminders
            </h1>
            <p className="text-muted-foreground mt-1">
              Track inspections, certifications, and compliance deadlines
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OfflineStatusBar />
            <Button onClick={() => navigate('/safety')}>
              <Shield className="h-4 w-4 mr-2" />
              Back to Safety Dashboard
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className={overdue.length > 0 ? 'border-red-300' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className={`text-2xl font-bold ${overdue.length > 0 ? 'text-red-600' : ''}`}>
                    {overdue.length}
                  </p>
                </div>
                <AlertTriangle className={`h-8 w-8 ${overdue.length > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className={dueToday.length > 0 ? 'border-yellow-300' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Due Today</p>
                  <p className={`text-2xl font-bold ${dueToday.length > 0 ? 'text-yellow-600' : ''}`}>
                    {dueToday.length}
                  </p>
                </div>
                <Clock className={`h-8 w-8 ${dueToday.length > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold">{upcoming.length}</p>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className={missedAssignments.length > 0 ? 'border-red-300' : 'border-green-300'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Missed</p>
                  <p className={`text-2xl font-bold ${missedAssignments.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {missedAssignments.length}
                  </p>
                </div>
                <Users className={`h-8 w-8 ${missedAssignments.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className={critical.length > 0 ? 'border-red-300' : 'border-green-300'}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className={`text-2xl font-bold ${critical.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {critical.length}
                  </p>
                </div>
                {critical.length > 0 ? (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="reminders" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="reminders">
              Active Reminders ({reminders.length})
            </TabsTrigger>
            <TabsTrigger value="schedules">
              Inspection Schedules ({regularSchedules.length})
            </TabsTrigger>
            <TabsTrigger value="vehicle">
              <Car className="h-4 w-4 mr-1" />
              Vehicle Maintenance ({vehicleSchedules.length})
            </TabsTrigger>
            <TabsTrigger value="assignments">
              <Users className="h-4 w-4 mr-1" />
              Staff Assignments ({todayAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="h-4 w-4 mr-1" />
              Scan QR
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Settings className="h-4 w-4 mr-1" />
              Auto Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reminders" className="space-y-4">
            {reminders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">All Clear!</h3>
                  <p className="text-muted-foreground">No pending safety reminders</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => {
                  const Icon = typeIcons[reminder.type] || Bell;
                  const daysUntil = differenceInDays(new Date(reminder.dueDate), new Date());
                  
                  return (
                    <Card 
                      key={reminder.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        reminder.status === 'overdue' ? 'border-red-300' : 
                        reminder.status === 'due_today' ? 'border-yellow-300' : ''
                      }`}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${priorityColors[reminder.priority]}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{reminder.title}</p>
                              <Badge 
                                variant={
                                  reminder.status === 'overdue' ? 'destructive' :
                                  reminder.status === 'due_today' ? 'secondary' : 'outline'
                                }
                                className="text-xs"
                              >
                                {reminder.status === 'overdue' ? 'Overdue' :
                                 reminder.status === 'due_today' ? 'Due Today' :
                                 `${daysUntil} days`}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{reminder.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {format(new Date(reminder.dueDate), 'MMM d, yyyy')}
                            </p>
                            <Badge variant="outline" className="capitalize text-xs">
                              {reminder.type}
                            </Badge>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inspection Schedules</CardTitle>
                  <CardDescription>
                    Configure recurring safety inspection schedules
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Staff
                  </Button>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {regularSchedules.map((schedule) => {
                    const isDue = new Date(schedule.next_due_date) <= new Date();
                    
                    return (
                      <div 
                        key={schedule.id}
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          isDue && schedule.is_enabled ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Switch 
                            checked={schedule.is_enabled} 
                            onCheckedChange={(checked) => toggleSchedule(schedule.id, checked)}
                          />
                          <div>
                            <p className="font-medium">{schedule.schedule_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {frequencyLabels[schedule.frequency]} • Next: {format(new Date(schedule.next_due_date), 'MMM d, yyyy')}
                              {schedule.last_completed_date && (
                                <span className="ml-2">
                                  • Last: {format(new Date(schedule.last_completed_date), 'MMM d')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{frequencyLabels[schedule.frequency]}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignStaff(schedule.id, schedule.schedule_name)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                          {isDue && schedule.is_enabled && (
                            <Button 
                              size="sm" 
                              onClick={() => markCompleted(schedule.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSchedule(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/safety/inspections/new')}>
                <CardContent className="py-6 flex items-center gap-4">
                  <FileCheck className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">Start Daily Inspection</p>
                    <p className="text-sm text-muted-foreground">Complete today's shop safety check</p>
                  </div>
                  <ArrowRight className="h-5 w-5 ml-auto" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/safety/equipment/inspect')}>
                <CardContent className="py-6 flex items-center gap-4">
                  <Wrench className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-medium">Inspect Equipment</p>
                    <p className="text-sm text-muted-foreground">Complete lift/hoist safety check</p>
                  </div>
                  <ArrowRight className="h-5 w-5 ml-auto" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vehicle" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Vehicle Maintenance Schedules
                  </CardTitle>
                  <CardDescription>
                    Time and mileage-based maintenance tracking for fleet vehicles
                  </CardDescription>
                </div>
                <Button onClick={() => setShowVehicleDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle Schedule
                </Button>
              </CardHeader>
              <CardContent>
                {vehicleSchedules.length === 0 ? (
                  <div className="text-center py-8">
                    <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No vehicle maintenance schedules</p>
                    <Button variant="outline" className="mt-4" onClick={() => setShowVehicleDialog(true)}>
                      Create First Schedule
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vehicleSchedules.map((schedule) => {
                      const isDue = new Date(schedule.next_due_date) <= new Date();
                      
                      return (
                        <div 
                          key={schedule.id}
                          className={`flex items-center justify-between p-4 border rounded-lg ${
                            isDue && schedule.is_enabled ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                              <Car className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{schedule.schedule_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {frequencyLabels[schedule.frequency]} • Due: {format(new Date(schedule.next_due_date), 'MMM d, yyyy')}
                                {schedule.mileage_interval && schedule.next_mileage && (
                                  <span className="ml-2">
                                    • or at {schedule.next_mileage.toLocaleString()} mi
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {schedule.mileage_interval && (
                              <Badge variant="outline">Every {schedule.mileage_interval.toLocaleString()} mi</Badge>
                            )}
                            {isDue && schedule.is_enabled && (
                              <Button 
                                size="sm" 
                                onClick={() => markCompleted(schedule.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Complete
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSchedule(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Staff Inspection Assignments
                  </CardTitle>
                  <CardDescription>
                    Track who is responsible for each inspection
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAssignDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Assignment
                </Button>
              </CardHeader>
              <CardContent>
                {/* Today's Assignments */}
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Today's Assignments</h3>
                  {todayAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assignments for today</p>
                  ) : (
                    <div className="space-y-2">
                      {todayAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{assignment.inspection_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.staff?.first_name} {assignment.staff?.last_name} • {assignment.shift} shift
                            </p>
                          </div>
                          {assignment.is_completed ? (
                            <Badge className="bg-green-100 text-green-800">Completed</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missed Assignments */}
                {missedAssignments.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Missed Assignments
                    </h3>
                    <div className="space-y-2">
                      {missedAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/10">
                          <div>
                            <p className="font-medium">{assignment.inspection_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.staff?.first_name} {assignment.staff?.last_name} • {format(new Date(assignment.assignment_date), 'MMM d')}
                            </p>
                          </div>
                          <Badge variant="destructive">Missed</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Code Scanner Tab */}
          <TabsContent value="qr" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code Scanner
                </CardTitle>
                <CardDescription>
                  Scan equipment or vehicle QR codes to quickly start inspections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-md mx-auto">
                  <QRCodeScanner />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto Work Order Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <AutoWorkOrderRulesPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Schedule Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Schedule</DialogTitle>
            <DialogDescription>
              Create a new recurring safety schedule
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule_name">Schedule Name *</Label>
              <Input
                id="schedule_name"
                value={newSchedule.schedule_name}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, schedule_name: e.target.value }))}
                placeholder="e.g., Weekly Fire Extinguisher Check"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <Select
                  value={newSchedule.schedule_type}
                  onValueChange={(v) => setNewSchedule(prev => ({ ...prev, schedule_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_inspection">Daily Inspection</SelectItem>
                    <SelectItem value="lift_inspection">Lift/Equipment Inspection</SelectItem>
                    <SelectItem value="safety_meeting">Safety Meeting</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="fire_safety">Fire Safety</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={newSchedule.frequency}
                  onValueChange={(v) => setNewSchedule(prev => ({ ...prev, frequency: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_due_date">Next Due Date</Label>
              <Input
                id="next_due_date"
                type="date"
                value={newSchedule.next_due_date}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, next_due_date: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSchedule} disabled={addingSchedule || !newSchedule.schedule_name}>
              {addingSchedule && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Assignment Dialog */}
      <AssignInspectionDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        scheduleId={selectedSchedule?.id}
        scheduleName={selectedSchedule?.name}
        onAssigned={() => {
          refetchAssignments();
          setSelectedSchedule(null);
        }}
      />

      {/* Vehicle Schedule Dialog */}
      <CreateVehicleScheduleDialog
        open={showVehicleDialog}
        onOpenChange={setShowVehicleDialog}
        onCreated={refetchSchedules}
      />
    </>
  );
}
