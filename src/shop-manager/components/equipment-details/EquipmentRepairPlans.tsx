
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RepairPlan } from "@/types/repairPlan";
import { RepairPlansList } from "@/components/repair-plan/RepairPlansList";
import { Plus, Wrench } from "lucide-react";

interface EquipmentRepairPlansProps {
  equipmentId: string;
  equipmentName: string;
  repairPlans: RepairPlan[];
}

export function EquipmentRepairPlans({ 
  equipmentId, 
  equipmentName,
  repairPlans
}: EquipmentRepairPlansProps) {
  // Filter repair plans for this equipment
  const equipmentRepairPlans = repairPlans.filter(plan => plan.equipmentId === equipmentId);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
        <div className="flex items-center">
          <Wrench className="h-5 w-5 mr-2 text-slate-500" />
          <CardTitle className="text-lg">Repair Plans for {equipmentName}</CardTitle>
        </div>
        <Link to={`/repair-plans/new?equipment=${equipmentId}`}>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Repair Plan
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <RepairPlansList 
          repairPlans={equipmentRepairPlans}
        />
      </CardContent>
    </Card>
  );
}
