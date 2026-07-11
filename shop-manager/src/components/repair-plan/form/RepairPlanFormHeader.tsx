
import React from "react";
import { Wrench } from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";

export function RepairPlanFormHeader() {
  return (
    <CardHeader>
      <CardTitle className="flex items-center">
        <Wrench className="mr-2 h-5 w-5" />
        Repair Plan
      </CardTitle>
    </CardHeader>
  );
}
