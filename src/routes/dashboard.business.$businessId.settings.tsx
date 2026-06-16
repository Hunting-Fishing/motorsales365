import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/business/$businessId/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId/settings" });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <Settings className="h-5 w-5" /> Settings
      </h1>
      <Card className="p-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          Edit business name, contact, photos, hours and service info.
        </p>
        <Button asChild>
          <Link to="/dashboard/businesses/$id/edit" params={{ id: businessId }}>
            Edit business profile
          </Link>
        </Button>
      </Card>
    </div>
  );
}
