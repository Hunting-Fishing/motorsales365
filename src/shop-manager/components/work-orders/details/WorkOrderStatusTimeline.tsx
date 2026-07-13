
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, User, AlertTriangle } from "lucide-react";
import { WorkOrder } from "@/types/workOrder"; // Updated import
import { formatDate } from "@/utils/workOrders";

interface WorkOrderStatusTimelineProps {
  workOrder: WorkOrder;
}

export function WorkOrderStatusTimeline({ workOrder }: WorkOrderStatusTimelineProps) {
  return (
    <Card>
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg">Work Order Details</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium mb-4">Basic Information</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-slate-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Date Created</p>
                  <p className="text-slate-900">{formatDate(workOrder.date)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <Clock className="h-5 w-5 text-slate-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Due Date</p>
                  <p className="text-slate-900">{formatDate(workOrder.dueDate)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-slate-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Location</p>
                  <p className="text-slate-900">{workOrder.location}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-medium mb-4">Assignment</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <User className="h-5 w-5 text-slate-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-500">Assigned Technician</p>
                  <p className="text-slate-900">{workOrder.technician}</p>
                </div>
              </div>

              <div className="flex items-start">
                <AlertTriangle className={`h-5 w-5 mr-3 mt-0.5 ${
                  workOrder.priority === 'high' ? 'text-red-500' : 
                  workOrder.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-slate-500">Priority</p>
                  <p className="text-slate-900 capitalize">{workOrder.priority}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
