
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreatePageHeader() {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link to="/team">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Add Team Member</h1>
        </div>
        <p className="text-slate-500">
          Create a new team member and assign their role and permissions
        </p>
      </div>
    </div>
  );
}
