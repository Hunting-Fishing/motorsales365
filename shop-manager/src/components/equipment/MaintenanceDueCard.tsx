
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarClock, Clock, AlertTriangle } from "lucide-react";
import { formatDate } from "@/utils/workOrders";
import { maintenanceFrequencyMap } from "@/data/equipmentData";
import type { EquipmentWithMaintenance } from "@/services/equipmentService";

interface MaintenanceDueCardProps {
  equipment: EquipmentWithMaintenance[];
}

export function MaintenanceDueCard({ equipment }: MaintenanceDueCardProps) {
  // Sort equipment by next maintenance date (ascending)
  const sortedEquipment = [...equipment].sort((a, b) => {
    const dateA = a.next_maintenance_date ? new Date(a.next_maintenance_date).getTime() : 0;
    const dateB = b.next_maintenance_date ? new Date(b.next_maintenance_date).getTime() : 0;
    return dateA - dateB;
  });

  // Check for overdue maintenance
  const today = new Date();
  const hasOverdueEquipment = equipment.some(
    item => item.next_maintenance_date && new Date(item.next_maintenance_date) < today
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5" /> 
          Upcoming Maintenance
          {hasOverdueEquipment && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Overdue
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEquipment.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming maintenance due within 30 days.</p>
        ) : (
          <div className="space-y-3">
            {sortedEquipment.map((item) => {
              if (!item.next_maintenance_date) return null;
              
              const maintenanceDate = new Date(item.next_maintenance_date);
              const isOverdue = maintenanceDate < today;
              const daysUntil = Math.ceil((maintenanceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={item.id} className="border rounded-md p-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/equipment/${item.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                        {item.name}
                      </Link>
                      <div className="flex flex-col mt-1 space-y-1">
                        <span className="text-xs text-slate-500">{item.customer}</span>
                        <span className="text-xs flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-slate-400" />
                          {maintenanceFrequencyMap[item.maintenance_frequency] || item.maintenance_frequency} maintenance
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                        {formatDate(item.next_maintenance_date)}
                      </span>
                      <div className="mt-1">
                        {isOverdue ? (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800">
                            Overdue by {Math.abs(daysUntil)} days
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                            Due in {daysUntil} days
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Link to={`/equipment/${item.id}`}>
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
