import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/dashboard/partner/qr-analytics")({
  component: QrAnalyticsTab,
});

function QrAnalyticsTab() {
  return (
    <Card className="border-amber-300 bg-amber-50 p-5 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        <h2 className="font-semibold">QR analytics</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Scans, signups and redemptions from every QR code you've shared. Filter by template, date,
        or campaign.
      </p>
      <Button asChild className="mt-3">
        <Link to="/admin/advertisements/analytics">
          Open analytics <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </Card>
  );
}
