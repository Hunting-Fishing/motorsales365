import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, ArrowRight, Wallet } from "lucide-react";

export const Route = createFileRoute("/dashboard/partner/performance")({
  component: PerformanceTab,
});

function PerformanceTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-sky-300 bg-sky-50 p-5 dark:border-sky-500/40 dark:bg-sky-500/10 md:col-span-2">
        <div className="mb-2 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="font-semibold">Sales performance</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Leads worked, deals closed and conversion rates for you and your team.
        </p>
        <Button asChild className="mt-3">
          <Link to="/dashboard/team/performance">
            Open performance <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>

      <Card className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          <h2 className="font-semibold">Commissions & payouts</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Your commission ledger and payout status.
        </p>
        <Button asChild variant="outline" className="mt-3">
          <Link to="/partner-program">
            View partner program <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </Card>
    </div>
  );
}
