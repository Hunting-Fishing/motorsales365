
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Loader2 } from "lucide-react";
import type { EquipmentWithMaintenance } from "@/services/equipmentService";
import { formatDate } from "@/utils/workOrders";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceHistoryTableProps {
  equipment: EquipmentWithMaintenance[];
}

interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  description: string;
  completedDate: string;
  technician: string | null;
  cost: number | null;
  status: string;
}

export function MaintenanceHistoryTable({ equipment }: MaintenanceHistoryTableProps) {
  const equipmentIds = equipment.map(e => e.id);
  
  // Fetch completed work orders for these equipment items as maintenance history
  const { data: maintenanceRecords = [], isLoading } = useQuery({
    queryKey: ['maintenance-history', equipmentIds],
    queryFn: async (): Promise<MaintenanceRecord[]> => {
      if (equipmentIds.length === 0) return [];
      
      // Get work orders that reference these equipment items and are completed
      const { data: workOrders, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          description,
          completed_at,
          status,
          assigned_to,
          total_cost,
          profiles:assigned_to (first_name, last_name)
        `)
        .in('equipment_id', equipmentIds)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      // Map to maintenance records format
      return (workOrders || []).map((wo: any) => {
        const equipmentItem = equipment.find(e => e.id === wo.equipment_id);
        return {
          id: wo.id,
          equipmentId: wo.equipment_id,
          equipmentName: equipmentItem?.name || 'Unknown',
          description: wo.description || 'Maintenance',
          completedDate: wo.completed_at,
          technician: wo.profiles ? `${wo.profiles.first_name} ${wo.profiles.last_name}` : null,
          cost: wo.total_cost,
          status: wo.status
        };
      });
    },
    enabled: equipmentIds.length > 0
  });

  const allMaintenanceRecords = maintenanceRecords;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Maintenance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allMaintenanceRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Maintenance History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium">No maintenance history</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Completed work orders for this equipment will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Maintenance History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Completed Date</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allMaintenanceRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.equipmentName}</TableCell>
                <TableCell>{record.description}</TableCell>
                <TableCell>{record.completedDate ? formatDate(record.completedDate) : 'N/A'}</TableCell>
                <TableCell>{record.technician || 'N/A'}</TableCell>
                <TableCell>{record.cost ? `$${record.cost.toFixed(2)}` : 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
