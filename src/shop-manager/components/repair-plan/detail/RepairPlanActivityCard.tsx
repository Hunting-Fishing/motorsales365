import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { RepairPlan } from "@/types/repairPlan";
import { formatDate } from "@/utils/workOrders";

interface RepairPlanActivityCardProps {
  repairPlan: RepairPlan;
}

export function RepairPlanActivityCard({ repairPlan }: RepairPlanActivityCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="border-l-2 border-muted pl-4">
            <h4 className="font-medium">Created</h4>
            <p className="text-sm text-muted-foreground">
              {formatDate(repairPlan.createdAt)}
            </p>
          </div>
          <div className="border-l-2 border-muted pl-4">
            <h4 className="font-medium">Last Updated</h4>
            <p className="text-sm text-muted-foreground">
              {formatDate(repairPlan.updatedAt)}
            </p>
          </div>
          {repairPlan.scheduledDate && (
            <div className="border-l-2 border-muted pl-4">
              <h4 className="font-medium">Scheduled</h4>
              <p className="text-sm text-muted-foreground">
                {formatDate(repairPlan.scheduledDate)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
