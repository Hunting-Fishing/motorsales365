import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { MaintenanceRecord } from "@/types/equipment";
import { formatDate } from "@/utils/dateUtils";
import { History, Wrench } from "lucide-react";

interface EquipmentMaintenanceHistoryProps {
  maintenanceHistory: MaintenanceRecord[];
}

export function EquipmentMaintenanceHistory({ maintenanceHistory }: EquipmentMaintenanceHistoryProps) {
  if (!maintenanceHistory || maintenanceHistory.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
          <div className="flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-slate-500" />
            <CardTitle className="text-lg">Maintenance History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center text-center p-6">
            <History className="h-12 w-12 text-slate-300 mb-2" />
            <h3 className="text-lg font-medium text-slate-900">No maintenance history</h3>
            <p className="text-sm text-slate-500 mt-1">
              No maintenance records have been found for this equipment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
        <div className="flex items-center">
          <Wrench className="h-5 w-5 mr-2 text-slate-500" />
          <CardTitle className="text-lg">Maintenance History</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {maintenanceHistory.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{formatDate(record.performed_date)}</TableCell>
                <TableCell>{record.performed_by || 'Unknown'}</TableCell>
                <TableCell>
                  <div>
                    <div>{record.description}</div>
                    {record.notes && (
                      <div className="text-xs text-slate-500 mt-1">{record.notes}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {record.cost ? `$${record.cost.toFixed(2)}` : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
