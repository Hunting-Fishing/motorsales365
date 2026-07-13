
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { RepairPlan } from "@/types/repairPlan";

interface RepairPlanHeaderProps {
  repairPlan: RepairPlan;
}

export function RepairPlanHeader({ repairPlan }: RepairPlanHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{repairPlan.title}</h1>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" onClick={() => navigate(`/repair-plans/${repairPlan.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Plan
        </Button>
      </div>
    </div>
  );
}
