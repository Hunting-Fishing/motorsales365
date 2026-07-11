
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Wrench, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Equipment } from "@/types/equipment";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface MaintenanceAlertsProps {
  overdueEquipment: Equipment[];
}

export function MaintenanceAlerts({ overdueEquipment }: MaintenanceAlertsProps) {
  if (overdueEquipment.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center">
            <CalendarCheck className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-700">
              All equipment maintenance is up to date. No overdue maintenance schedules.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-red-50 border-red-200">
      <CardContent className="p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-700 font-medium mb-2">
              {overdueEquipment.length} {overdueEquipment.length === 1 ? 'item' : 'items'} with overdue maintenance
            </p>
            <ul className="space-y-2 mb-3">
              {overdueEquipment.slice(0, 3).map((item) => (
                <li key={item.id} className="text-sm text-red-600 flex justify-between">
                  <span>{item.name} ({item.customer})</span>
                  <span>Due: {item.next_maintenance_date ? format(new Date(item.next_maintenance_date), "MMM d, yyyy") : 'N/A'}</span>
                </li>
              ))}
              {overdueEquipment.length > 3 && (
                <li className="text-sm text-red-600">
                  +{overdueEquipment.length - 3} more overdue items...
                </li>
              )}
            </ul>
            <div className="flex justify-end">
              <Button size="sm" className="bg-red-600 hover:bg-red-700" asChild>
                <Link to="#upcoming">
                  <Wrench className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
