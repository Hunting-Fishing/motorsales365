
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock } from "lucide-react";
import type { EquipmentWithMaintenance } from "@/services/equipmentService";

interface MaintenanceSchedule {
  id: string;
  frequency_type: string;
  next_date: string;
  description: string;
  estimated_duration?: number;
  technician_id?: string;
  is_recurring: boolean;
}

interface EquipmentMaintenanceSchedulesProps {
  equipment: EquipmentWithMaintenance;
  onAddSchedule?: () => void;
}

export function EquipmentMaintenanceSchedules({ 
  equipment, 
  onAddSchedule 
}: EquipmentMaintenanceSchedulesProps) {
  const [schedules] = useState<MaintenanceSchedule[]>([]);

  const handleAddSchedule = () => {
    if (onAddSchedule) {
      onAddSchedule();
    }
  };

  const getFrequencyBadgeColor = (frequency: string) => {
    switch (frequency.toLowerCase()) {
      case 'monthly':
        return 'bg-blue-100 text-blue-800';
      case 'quarterly':
        return 'bg-green-100 text-green-800';
      case 'annually':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Maintenance Schedules
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAddSchedule}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No maintenance schedules
            </h3>
            <p className="text-gray-500 mb-4">
              Create scheduled maintenance tasks to keep this equipment running smoothly.
            </p>
            <Button onClick={handleAddSchedule}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Schedule
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{schedule.description}</h4>
                      <Badge className={getFrequencyBadgeColor(schedule.frequency_type)}>
                        {schedule.frequency_type}
                      </Badge>
                      {schedule.is_recurring && (
                        <Badge variant="outline">Recurring</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Next: {new Date(schedule.next_date).toLocaleDateString()}
                      </div>
                      {schedule.estimated_duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {schedule.estimated_duration}h estimated
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      Complete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
