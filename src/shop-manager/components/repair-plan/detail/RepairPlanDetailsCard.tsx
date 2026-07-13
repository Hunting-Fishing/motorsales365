
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Wrench } from "lucide-react";
import { RepairPlan } from "@/types/repairPlan";
import { formatDate } from "@/utils/workOrders";
import { SendSmsButton } from "@/components/calls/SendSmsButton";
import { VoiceCallButton } from "@/components/calls/VoiceCallButton";

interface RepairPlanDetailsCardProps {
  repairPlan: RepairPlan;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}

export function RepairPlanDetailsCard({ 
  repairPlan, 
  getStatusColor, 
  getPriorityColor 
}: RepairPlanDetailsCardProps) {
  // This would come from customer data in a real app
  const phoneNumber = "";
  const customerId = "";

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Wrench className="mr-2 h-5 w-5" />
            Plan Details
          </CardTitle>
          <div className="flex space-x-2">
            <SendSmsButton 
              phoneNumber={phoneNumber} 
              message={`Hello, regarding your repair plan: ${repairPlan.description}`} 
              customerId={customerId}
              variant="outline"
              size="sm"
            />
            <VoiceCallButton
              phoneNumber={phoneNumber}
              callType="service_update" 
              customerId={customerId}
              variant="outline"
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-lg">Description</h3>
            <p className="mt-1 text-muted-foreground">{repairPlan.description}</p>
          </div>
          
          <div>
            <h3 className="font-medium">Equipment</h3>
            <p className="mt-1 text-muted-foreground">
              {/* In a real app, fetch equipment details */}
              HVAC System - Model XYZ-123
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Status</h3>
              <Badge className={`mt-1 ${getStatusColor(repairPlan.status)}`}>
                {repairPlan.status.charAt(0).toUpperCase() + repairPlan.status.slice(1)}
              </Badge>
            </div>
            
            <div>
              <h3 className="font-medium">Priority</h3>
              <Badge className={`mt-1 ${getPriorityColor(repairPlan.priority)}`}>
                {repairPlan.priority.charAt(0).toUpperCase() + repairPlan.priority.slice(1)}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Scheduled Date</h3>
              <p className="mt-1 flex items-center text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1" />
                {repairPlan.scheduledDate ? formatDate(repairPlan.scheduledDate) : 'Not scheduled'}
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">Estimated Duration</h3>
              <p className="mt-1 flex items-center text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {repairPlan.estimatedDuration} hours
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Assigned Technician</h3>
              <p className="mt-1 text-muted-foreground">
                {repairPlan.assignedTechnician || 'Unassigned'}
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">Cost Estimate</h3>
              <p className="mt-1 text-muted-foreground">
                ${repairPlan.costEstimate?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium">Customer Approval</h3>
            <p className="mt-1 flex items-center">
              {repairPlan.customerApproved ? (
                <Badge className="bg-green-100 text-green-800 flex items-center">
                  <span className="mr-1">✓</span>
                  Approved
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800 flex items-center">
                  <span className="mr-1">✗</span>
                  Not Approved
                </Badge>
              )}
            </p>
          </div>
          
          {repairPlan.notes && (
            <div>
              <h3 className="font-medium">Notes</h3>
              <p className="mt-1 text-muted-foreground">{repairPlan.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
