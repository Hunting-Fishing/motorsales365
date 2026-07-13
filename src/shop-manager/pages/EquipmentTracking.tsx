import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEquipment } from '@/hooks/useEquipment';
import { useEquipmentInspections } from '@/hooks/useEquipmentInspections';
import { useMaintenanceSchedules } from '@/hooks/useMaintenanceSchedules';
import { PreTripInspectionDialogWithTemplate } from '@/components/equipment/PreTripInspectionDialogWithTemplate';
import { ClipboardCheck, Calendar, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function EquipmentTracking() {
  const { equipment, isLoading } = useEquipment();
  const { inspections, fetchInspections } = useEquipmentInspections();
  const { schedules } = useMaintenanceSchedules();
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'maintenance':
        return 'bg-amber-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getOverallStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-600">Pass</Badge>;
      case 'pass_with_notes':
        return <Badge className="bg-amber-600">Pass with Notes</Badge>;
      case 'fail':
        return <Badge className="bg-red-600">Fail</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getMaintenanceStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-600">Scheduled</Badge>;
      case 'due_soon':
        return <Badge className="bg-amber-600">Due Soon</Badge>;
      case 'overdue':
        return <Badge className="bg-red-600">Overdue</Badge>;
      case 'completed':
        return <Badge className="bg-green-600">Completed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const overdueSchedules = schedules.filter(s => s.status === 'overdue');
  const dueSoonSchedules = schedules.filter(s => s.status === 'due_soon');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipment Tracking & Inspections</h1>
          <p className="text-muted-foreground">
            Pre-trip inspections, usage tracking, and smart maintenance scheduling
          </p>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Overdue Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overdueSchedules.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              Due Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dueSoonSchedules.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Within next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Inspections Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {inspections.filter(i => {
                const inspDate = new Date(i.inspection_date);
                const today = new Date();
                return inspDate.toDateString() === today.toDateString();
              }).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed inspections</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="equipment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="inspections">Recent Inspections</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map((item) => {
              const latestInspection = inspections
                .filter(i => i.equipment_id === item.id)
                .sort((a, b) => new Date(b.inspection_date).getTime() - new Date(a.inspection_date).getTime())[0];

              return (
                <Card key={item.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        <CardDescription>{item.model}</CardDescription>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{item.location || 'N/A'}</span>
                      </div>
                      {latestInspection && (
                        <>
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">Last Reading:</span>
                            <span className="font-medium">
                              {latestInspection.current_reading} {latestInspection.reading_type}
                            </span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground">Last Inspection:</span>
                            <span className="font-medium">
                              {format(new Date(latestInspection.inspection_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status:</span>
                            {getOverallStatusBadge(latestInspection.overall_status)}
                          </div>
                        </>
                      )}
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedEquipment(item);
                        setInspectionDialogOpen(true);
                      }}
                    >
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Start Pre-Trip
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Inspections</CardTitle>
              <CardDescription>Pre-trip inspection history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inspections.slice(0, 10).map((inspection) => {
                  const equip = equipment.find(e => e.id === inspection.equipment_id);
                  return (
                    <div key={inspection.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{equip?.name || 'Unknown Equipment'}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(inspection.inspection_date), 'MMM d, yyyy h:mm a')} • 
                          Reading: {inspection.current_reading} {inspection.reading_type}
                        </div>
                        {inspection.general_notes && (
                          <div className="text-sm text-muted-foreground mt-1">{inspection.general_notes}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {inspection.urgent_repair && (
                          <Badge variant="destructive">Urgent</Badge>
                        )}
                        {inspection.requires_maintenance && (
                          <Badge variant="outline">Maintenance Needed</Badge>
                        )}
                        {getOverallStatusBadge(inspection.overall_status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Maintenance Schedule</CardTitle>
              <CardDescription>Usage-based and time-based maintenance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules.map((schedule) => {
                  const equip = equipment.find(e => e.id === schedule.equipment_id);
                  const remainingUsage = schedule.next_service_reading && schedule.usage_metric
                    ? `${schedule.next_service_reading} ${schedule.usage_metric} remaining`
                    : null;

                  return (
                    <div key={schedule.id} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{schedule.schedule_name}</div>
                          <div className="text-sm text-muted-foreground">{equip?.name || 'Unknown Equipment'}</div>
                        </div>
                        {getMaintenanceStatusBadge(schedule.status)}
                      </div>
                      
                      {schedule.description && (
                        <div className="text-sm text-muted-foreground">{schedule.description}</div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {schedule.predicted_service_date && (
                          <div>
                            <span className="text-muted-foreground">Predicted Date:</span>
                            <div className="font-medium">{format(new Date(schedule.predicted_service_date), 'MMM d, yyyy')}</div>
                          </div>
                        )}
                        {remainingUsage && (
                          <div>
                            <span className="text-muted-foreground">Remaining Usage:</span>
                            <div className="font-medium">{remainingUsage}</div>
                          </div>
                        )}
                        {schedule.locked_service_date && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Locked Date:</span>
                            <div className="font-medium text-red-600">
                              {format(new Date(schedule.locked_service_date), 'MMM d, yyyy')} 
                              {schedule.status === 'overdue' && ' (OVERDUE)'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {schedules.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No maintenance schedules configured yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedEquipment && (
        <PreTripInspectionDialogWithTemplate
          open={inspectionDialogOpen}
          onOpenChange={setInspectionDialogOpen}
          equipmentId={selectedEquipment.id}
          equipmentName={selectedEquipment.name}
          readingType="hours"
          inspectionTemplateId={selectedEquipment.inspection_template_id}
          equipmentType={selectedEquipment.equipment_type}
        />
      )}
    </div>
  );
}
