
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function ProfileNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <h2 className="text-2xl font-bold">Team Member Not Found</h2>
      <p className="text-slate-500">The team member you're looking for doesn't exist or has been removed.</p>
      <Button asChild>
        <Link to="/team">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Team
        </Link>
      </Button>
    </div>
  );
}
