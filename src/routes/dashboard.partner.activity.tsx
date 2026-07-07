import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/partner/activity")({
  component: ActivityTab,
});

function ActivityTab() {
  return (
    <Card className="border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-500/40 dark:bg-emerald-500/10">
      <div className="mb-2 flex items-center gap-2">
        <LifeBuoy className="h-5 w-5" />
        <h2 className="font-semibold">Activity & reports</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Community activity feed and moderation reports.
      </p>
      <Button asChild className="mt-3">
        <Link to="/admin/reports">
          Open reports <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}
