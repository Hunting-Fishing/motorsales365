
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { EquipmentWithMaintenance } from "@/services/equipmentService";
import { formatDate } from "@/utils/workOrders";
import { CalendarRange, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface SchedulerEquipmentListProps {
  equipmentList: EquipmentWithMaintenance[];
}

export function SchedulerEquipmentList({ equipmentList }: SchedulerEquipmentListProps) {
  // Filter equipment that has maintenance dates scheduled
  const equipmentWithSchedules = equipmentList.filter(
    equip => equip.next_maintenance_date
  );
  
  if (equipmentWithSchedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CalendarRange className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h3 className="text-lg font-medium">No maintenance schedules</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          No equipment has maintenance schedules configured. Add a schedule to track and manage maintenance tasks.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Equipment</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Next Maintenance</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {equipmentWithSchedules.map(equipment => {
          const today = new Date();
          const nextDate = new Date(equipment.next_maintenance_date);
          const isOverdue = nextDate < today;
          
          return (
            <TableRow key={equipment.id}>
              <TableCell className="font-medium">
                <Link to={`/equipment/${equipment.id}`} className="hover:underline text-blue-600">
                  {equipment.name}
                </Link>
              </TableCell>
              <TableCell>{equipment.customer}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {formatDate(equipment.next_maintenance_date)}
                </div>
              </TableCell>
              <TableCell className="capitalize">{equipment.maintenance_frequency}</TableCell>
              <TableCell>
                {isOverdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Scheduled
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/equipment/${equipment.id}`}>Manage</Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
