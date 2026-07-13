
import { RepairPlansList } from "@/components/repair-plan/RepairPlansList";
import { useRepairPlans } from "@/hooks/useRepairPlans";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function RepairPlans() {
  const { repairPlans, loading, error } = useRepairPlans();

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading repair plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-destructive">Error: {error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Repair Plans</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage repair plans for equipment maintenance and repairs.
          </p>
        </div>
        <Link to="/repair-plans/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Repair Plan
          </Button>
        </Link>
      </div>
      
      <RepairPlansList repairPlans={repairPlans} />
    </div>
  );
}
