import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Ship, Forklift, Truck, ClipboardCheck, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { WorkOrder } from '@/types/workOrder';

interface WorkOrderInspectionsTabProps {
  workOrder: WorkOrder;
}

export function WorkOrderInspectionsTab({ workOrder }: WorkOrderInspectionsTabProps) {
  const navigate = useNavigate();

  // Get the equipment/vehicle ID - check both vehicle_id and any linked equipment
  const equipmentId = workOrder.vehicle_id;

  // Fetch related vessel inspections - check both vessel_id and equipment_id columns
  const { data: vesselInspections, isLoading: vesselLoading } = useQuery({
    queryKey: ['work-order-vessel-inspections', equipmentId, workOrder.id],
    queryFn: async () => {
      if (!equipmentId) return [];
      
      // Query by vessel_id OR by work_order_id if linked
      const { data, error } = await supabase
        .from('vessel_inspections')
        .select('*')
        .or(`vessel_id.eq.${equipmentId},work_order_id.eq.${workOrder.id}`)
        .order('inspection_date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!equipmentId || !!workOrder.id
  });

  // Fetch forklift inspections - check equipment_id
  const { data: forkliftInspections, isLoading: forkliftLoading } = useQuery({
    queryKey: ['work-order-forklift-inspections', equipmentId, workOrder.id],
    queryFn: async () => {
      if (!equipmentId) return [];
      
      const { data, error } = await supabase
        .from('forklift_inspections')
        .select('*')
        .or(`equipment_id.eq.${equipmentId},work_order_id.eq.${workOrder.id}`)
        .order('inspection_date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!equipmentId || !!workOrder.id
  });

  // Fetch DVIR reports
  const { data: dvirReports, isLoading: dvirLoading } = useQuery({
    queryKey: ['work-order-dvir', equipmentId, workOrder.id],
    queryFn: async () => {
      if (!equipmentId) return [];
      
      const { data, error } = await supabase
        .from('dvir_reports')
        .select('*')
        .or(`vehicle_id.eq.${equipmentId},work_order_id.eq.${workOrder.id}`)
        .order('inspection_date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!equipmentId || !!workOrder.id
  });

  const inspectionTypes = [
    {
      title: 'Vessel Inspection',
      description: 'Pre-trip marine vessel inspection',
      icon: Ship,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      href: `/safety/vessels?workOrderId=${workOrder.id}${equipmentId ? `&equipmentId=${equipmentId}` : ''}`,
      inspections: vesselInspections || [],
      loading: vesselLoading
    },
    {
      title: 'Forklift Inspection',
      description: 'Daily forklift safety check',
      icon: Forklift,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: `/safety/equipment/forklift?workOrderId=${workOrder.id}${equipmentId ? `&equipmentId=${equipmentId}` : ''}`,
      inspections: forkliftInspections || [],
      loading: forkliftLoading
    },
    {
      title: 'DVIR Report',
      description: 'Driver vehicle inspection report',
      icon: Truck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: `/safety/dvir/new?workOrderId=${workOrder.id}${equipmentId ? `&vehicleId=${equipmentId}` : ''}`,
      inspections: dvirReports || [],
      loading: dvirLoading
    }
  ];

  const getStatusBadge = (inspection: any) => {
    const isSafe = inspection.safe_to_operate ?? inspection.overall_status === 'pass';
    const hasConcerns = inspection.has_concerns ?? inspection.overall_status !== 'pass';
    
    if (!isSafe) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Not Safe</Badge>;
    }
    if (hasConcerns) {
      return <Badge variant="outline" className="text-amber-500 border-amber-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Concerns</Badge>;
    }
    return <Badge variant="outline" className="text-emerald-500 border-emerald-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />Pass</Badge>;
  };

  const hasNoEquipment = !equipmentId;

  return (
    <div className="space-y-6">
      {/* No Equipment Warning */}
      {hasNoEquipment && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">No Equipment Linked</p>
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  This work order doesn't have a vehicle or equipment linked. Inspections created will only be associated by work order ID.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Start New Inspection
          </CardTitle>
          <CardDescription>
            Run a safety inspection related to this work order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {inspectionTypes.map((type) => (
              <Button
                key={type.title}
                variant="outline"
                className={`h-auto py-4 flex flex-col items-center gap-2 ${type.bgColor} hover:opacity-80 transition-opacity`}
                onClick={() => navigate(type.href)}
              >
                <type.icon className={`h-8 w-8 ${type.color}`} />
                <span className="font-medium">{type.title}</span>
                <span className="text-xs text-muted-foreground">{type.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Inspections */}
      <Card>
        <CardHeader>
          <CardTitle>Related Inspection History</CardTitle>
          <CardDescription>
            Recent inspections for this equipment/vehicle or work order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {inspectionTypes.map((type) => (
              <div key={type.title}>
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <type.icon className={`h-4 w-4 ${type.color}`} />
                  {type.title}s
                </h4>
                {type.loading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : type.inspections.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2 px-3 bg-muted/50 rounded-md">
                    No {type.title.toLowerCase()}s found for this equipment
                  </div>
                ) : (
                  <div className="space-y-2">
                    {type.inspections.map((inspection: any) => (
                      <div
                        key={inspection.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium text-sm">
                              {format(new Date(inspection.inspection_date), 'MMM d, yyyy h:mm a')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Inspector: {inspection.inspector_name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(inspection)}
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
