
import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Tag } from "lucide-react";

export function RepairPlanActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button className="w-full" variant="default">
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Repair
          </Button>
          <Button className="w-full" variant="outline">
            <Tag className="mr-2 h-4 w-4" />
            Create Work Order
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
