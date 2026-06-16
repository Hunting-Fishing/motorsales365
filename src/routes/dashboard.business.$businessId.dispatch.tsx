import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Radio, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/business/$businessId/dispatch")({
  component: DispatchRedirect,
});

function DispatchRedirect() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId/dispatch" });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Radio className="h-5 w-5" /> Dispatch
      </h1>
      <Card className="p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          The live dispatch queue and tow request workflow runs on the existing dispatch
          tools. Driver-assignment from this workspace is coming next — for now, accept and
          stage jobs using the dedicated pages below.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/dashboard/dispatch">
              <ExternalLink className="h-4 w-4 mr-1" /> Open live Dispatch queue
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/tow">Open Tow requests & bids</Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              to="/dashboard/business/$businessId/fleet"
              params={{ businessId }}
            >
              Manage trucks
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
