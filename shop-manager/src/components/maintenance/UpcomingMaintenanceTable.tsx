
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EquipmentWithMaintenance } from "@/services/equipmentService";
import { formatDate } from "@/utils/workOrders";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyMaintenanceState } from "./EmptyMaintenanceState";

interface UpcomingMaintenanceTableProps {
  upcomingMaintenance: Array<{ equipment: EquipmentWithMaintenance; dueDate: string }>;
  filterStatus: "all" | "overdue" | "scheduled";
  setFilterStatus: (status: "all" | "overdue" | "scheduled") => void;
}

export function UpcomingMaintenanceTable({ 
  upcomingMaintenance,
  filterStatus,
  setFilterStatus
}: UpcomingMaintenanceTableProps) {
  const today = new Date();

  // Filter maintenance based on selected status
  const filteredMaintenance = upcomingMaintenance.filter(item => {
    const dueDate = new Date(item.dueDate);
    const isOverdue = dueDate < today;
    
    if (filterStatus === "overdue") return isOverdue;
    if (filterStatus === "scheduled") return !isOverdue;
    return true; // "all" shows everything
  });

  return (
    <Card>
      <CardHeader className="bg-muted/30 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center text-lg">
            <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
            Upcoming Maintenance
          </CardTitle>
          <div className="flex items-center">
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="overdue">Overdue Only</SelectItem>
                <SelectItem value="scheduled">Scheduled Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredMaintenance.length === 0 ? (
          <EmptyMaintenanceState 
            message={`No ${filterStatus !== "all" ? filterStatus : ""} maintenance tasks found`} 
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Maintenance Type</TableHead>
                <TableHead>Next Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaintenance.map((item, index) => {
                const dueDate = new Date(item.dueDate);
                const isOverdue = dueDate < today;
                const daysUntil = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <TableRow key={`${item.equipment.id}-${index}`}>
                    <TableCell className="font-medium">
                      <Link 
                        to={`/equipment/${item.equipment.id}`} 
                        className="hover:underline text-blue-600"
                      >
                        {item.equipment.name}
                      </Link>
                    </TableCell>
                    <TableCell>{item.equipment.customer}</TableCell>
                    <TableCell>{item.equipment.maintenance_frequency}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                        {formatDate(item.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isOverdue ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Overdue by {Math.abs(daysUntil)} days</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Due in {daysUntil} days
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <Link to={`/equipment/${item.equipment.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
