
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

export function TeamHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-slate-500">
          Manage your team members and their roles
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          asChild
          className="bg-esm-blue-600 hover:bg-esm-blue-700"
        >
          <Link to="/team/create">
            <Plus className="h-4 w-4 mr-2" />
            Add Team Member
          </Link>
        </Button>
        <Button 
          variant="outline"
          asChild
        >
          <Link to="/team/roles">
            Manage Roles
          </Link>
        </Button>
      </div>
    </div>
  );
}
