
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function EquipmentHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipment Management</h1>
        <p className="text-muted-foreground">
          Manage and track customer equipment, maintenance schedules, and warranties
        </p>
      </div>
      <Link to="/equipment/new">
        <Button className="flex items-center gap-1">
          <PlusCircle className="h-5 w-5 mr-1" />
          Add Equipment
        </Button>
      </Link>
    </div>
  );
}
