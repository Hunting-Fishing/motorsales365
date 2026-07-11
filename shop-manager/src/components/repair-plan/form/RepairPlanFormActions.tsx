
import React from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export function RepairPlanFormActions() {
  return (
    <div className="flex justify-end">
      <Button type="submit">
        <Save className="h-4 w-4 mr-2" />
        Save Repair Plan
      </Button>
    </div>
  );
}
