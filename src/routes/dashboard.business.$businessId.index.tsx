import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Radio, Truck, Users, AlertTriangle, Wrench, Receipt, ListChecks } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkspaceBusiness, getTowOverviewStats } from "@/lib/business-workspace.functions";
import { KIND_LANDING_BLURB } from "@/lib/business-workspace/modules";

export const Route = createFileRoute("/dashboard/business/$businessId/")({
  component: WorkspaceOverview,
});

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone?: "warn";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <Icon
          className={
            tone === "warn" ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-muted-foreground"
          }
        />
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function WorkspaceOverview() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId/" });
  const { user } = useAuth();
  const loadBiz = useServerFn(getWorkspaceBusiness);
  const loadStats = useServerFn(getTowOverviewStats);

  const bizQ = useQuery({
    queryKey: ["workspace-business", businessId, user?.id],
    enabled: !!user?.id,
    queryFn: () => loadBiz({ data: { businessId } }),
  });

  const kind = bizQ.data?.business?.type_slug;
  const isTow = kind === "towing";

  const statsQ = useQuery({
    queryKey: ["workspace-tow-stats", businessId],
    enabled: !!user?.id && isTow,
    queryFn: () => loadStats({ data: { businessId } }),
    refetchInterval: 30_000,
  });

  if (bizQ.isLoading) return <Skeleton className="h-48" />;
  if (!bizQ.data) return null;

  const blurb = KIND_LANDING_BLURB[kind ?? ""] ?? "Manage your business operations.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{bizQ.data.business.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{blurb}</p>
      </div>

      {isTow ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statsQ.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : (
              <>
                <Stat label="Open jobs" value={statsQ.data?.openJobs ?? 0} icon={Radio} />
                <Stat label="Jobs today" value={statsQ.data?.jobsToday ?? 0} icon={Receipt} />
                <Stat
                  label="Drivers on shift"
                  value={statsQ.data?.driversOnShift ?? 0}
                  icon={Users}
                />
                <Stat label="Active trucks" value={statsQ.data?.activeAssets ?? 0} icon={Truck} />
                <Stat
                  label="Low stock"
                  value={statsQ.data?.lowStockCount ?? 0}
                  icon={AlertTriangle}
                  tone={(statsQ.data?.lowStockCount ?? 0) > 0 ? "warn" : undefined}
                />
              </>
            )}
          </div>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">First-run checklist</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between items-center">
                <span>Add your first tow truck or flatbed</span>
                <Button size="sm" variant="outline" asChild>
                  <Link
                    to="/dashboard/business/$businessId/fleet"
                    params={{ businessId }}
                  >
                    Add asset
                  </Link>
                </Button>
              </li>
              <li className="flex justify-between items-center">
                <span>Invite a driver or dispatcher</span>
                <Button size="sm" variant="outline" asChild>
                  <Link
                    to="/dashboard/business/$businessId/staff"
                    params={{ businessId }}
                  >
                    Invite employee
                  </Link>
                </Button>
              </li>
              <li className="flex justify-between items-center">
                <span>Set your rates & coverage area</span>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/dashboard/tow">Open rates</Link>
                </Button>
              </li>
              <li className="flex justify-between items-center">
                <span>Activate Dispatch subscription</span>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/dashboard/dispatch">Open Dispatch</Link>
                </Button>
              </li>
            </ul>
          </Card>

          <div className="grid md:grid-cols-2 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="h-4 w-4" />
                <h3 className="font-semibold">Live dispatch queue</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Accept incoming tow jobs, assign drivers and trucks, and track lifecycle.
              </p>
              <Button asChild size="sm">
                <Link
                  to="/dashboard/business/$businessId/dispatch"
                  params={{ businessId }}
                >
                  Open Dispatch
                </Link>
              </Button>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4" />
                <h3 className="font-semibold">Fleet maintenance</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Log service history per truck and never miss the next due date.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link
                  to="/dashboard/business/$businessId/fleet"
                  params={{ businessId }}
                >
                  Manage fleet
                </Link>
              </Button>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className="h-4 w-4" />
            <h3 className="font-semibold">Workspace ready</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Vertical-specific modules for this business kind are coming soon. In the meantime, use
            the sidebar to manage your staff, listings, and settings.
          </p>
        </Card>
      )}
    </div>
  );
}
