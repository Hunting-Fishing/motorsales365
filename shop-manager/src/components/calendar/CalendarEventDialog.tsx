
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/types/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, Calendar as CalendarIcon, FileText, Wrench, CheckSquare } from "lucide-react";
import { statusMap } from "@/utils/workOrders";
import { formatDate, formatTime } from "@/utils/dateUtils";
import { Link } from "react-router-dom";
import { TaskDetailDialog } from "./tasks/TaskDetailDialog";

interface CalendarEventDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CalendarEventDialog({ event, isOpen, onClose }: CalendarEventDialogProps) {
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  if (!event) return null;

  const isTask = event.type === 'task' || event.event_type === 'task';

  // If it's a task, render TaskDetailDialog instead
  if (isTask) {
    return (
      <TaskDetailDialog
        taskId={event.id}
        isOpen={isOpen}
        onClose={onClose}
      />
    );
  }

  const startTime = event.start ? formatTime(event.start) : '';
  const endTime = event.end ? formatTime(event.end) : '';
  const eventDate = event.start ? formatDate(event.start) : formatDate(new Date().toISOString());

  const isWorkOrder = event.type === 'work-order';
  const isMaintenanceRequest = event.type === 'maintenance-request';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{event.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Badge variant={event.type === 'work-order' ? 'default' : 'secondary'}>
              {event.type === 'work-order' ? 'Work Order' : 
               event.type === 'maintenance-request' ? 'Maintenance Request' : 
               'Appointment'}
            </Badge>
            
            {isWorkOrder && event.status && (
              <Badge 
                variant="outline" 
                className={`
                  ${event.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                  ${event.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : ''}
                  ${event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${event.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : ''}
                `}
              >
                {statusMap[event.status] || event.status}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{eventDate}</span>
            <span className="text-muted-foreground">•</span>
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{startTime} - {endTime}</span>
          </div>
          
          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
          
          {event.technician && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Assigned to {event.technician}</span>
            </div>
          )}
          
          {event.description && (
            <div className="pt-2">
              <div className="flex items-center gap-2 text-sm mb-1">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Description</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">{event.description}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          <div className="flex gap-2">
            {isWorkOrder && event.id && (
              <Button asChild>
                <Link to={`/work-orders/${event.id}`}>
                  View Work Order
                </Link>
              </Button>
            )}
            
            {isMaintenanceRequest && (
              <Button asChild>
                <Link to={`/work-orders/new?maintenanceRequestId=${
                  (event.work_order_id || event.id).replace(/^maintenance-/, '')
                }`}>
                  <Wrench className="mr-2 h-4 w-4" />
                  Convert to Work Order
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}