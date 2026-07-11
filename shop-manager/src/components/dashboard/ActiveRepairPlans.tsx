
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench } from "lucide-react";
import { RepairPlan } from "@/types/repairPlan";

interface ActiveRepairPlansProps {
  repairPlans: RepairPlan[];
}

export function ActiveRepairPlans({ repairPlans }: ActiveRepairPlansProps) {
  // Filter to only show in-progress and scheduled plans
  const activeRepairPlans = repairPlans
    .filter(plan => plan.status === "in-progress" || plan.status === "scheduled")
    .sort((a, b) => {
      // Sort by priority first (critical, high, medium, low)
      const priorityOrder = { "critical": 0, "high": 1, "medium": 2, "low": 3 };
      const priorityDiff = 
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - 
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by status (in-progress first, then scheduled)
      if (a.status === "in-progress" && b.status !== "in-progress") return -1;
      if (a.status !== "in-progress" && b.status === "in-progress") return 1;
      
      // If still tied, sort by scheduled date (earliest first)
      if (a.scheduledDate && b.scheduledDate) {
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      }
      
      // Put plans with a scheduled date before those without one
      if (a.scheduledDate && !b.scheduledDate) return -1;
      if (!a.scheduledDate && b.scheduledDate) return 1;
      
      return 0;
    })
    .slice(0, 5); // Limit to 5 plans for the dashboard
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between bg-muted/50">
        <CardTitle className="text-lg flex items-center">
          <Wrench className="mr-2 h-5 w-5" />
          Active Repair Plans
        </CardTitle>
        <Link to="/repair-plans/new">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Plan
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {activeRepairPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No active repair plans</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mb-4">
              Create a new repair plan to schedule equipment maintenance and repairs.
            </p>
            <Link to="/repair-plans/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Repair Plan
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {activeRepairPlans.map((plan) => (
              <li key={plan.id} className="p-4 hover:bg-muted/20">
                <Link to={`/repair-plans/${plan.id}`} className="block">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{plan.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {plan.description}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={getStatusColor(plan.status)}>
                          {plan.status === "in-progress" ? "In Progress" : "Scheduled"}
                        </Badge>
                        <Badge className={getPriorityColor(plan.priority)}>
                          {plan.priority.charAt(0).toUpperCase() + plan.priority.slice(1)} Priority
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      {plan.assignedTechnician && (
                        <div className="text-muted-foreground">
                          {plan.assignedTechnician}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <div className="text-xs text-muted-foreground mr-2">Progress:</div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 mr-2">
                        <div 
                          className="h-1.5 rounded-full bg-blue-500" 
                          style={{ 
                            width: `${plan.tasks.filter(t => t.completed).length / plan.tasks.length * 100}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs whitespace-nowrap">
                        {plan.tasks.filter(t => t.completed).length}/{plan.tasks.length}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="p-4 text-center border-t">
          <Link to="/repair-plans">
            <Button variant="ghost" size="sm">
              View All Repair Plans
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
