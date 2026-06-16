import { createFileRoute, Outlet, useParams, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getWorkspaceBusiness } from "@/lib/business-workspace.functions";
import { getBusinessPlanUsage } from "@/lib/business-plan-usage.functions";
import { WorkspaceSidebar } from "@/components/business-workspace/sidebar";
import { WorkspaceNotificationsProvider } from "@/components/business-workspace/notifications-provider";
import { WorkspaceNotificationBell } from "@/components/business-workspace/notification-bell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/business/$businessId")({
  component: WorkspaceLayout,
  head: () => ({
    meta: [
      { title: "Business workspace — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function WorkspaceLayout() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId" });
  const { user, loading } = useAuth();
  const load = useServerFn(getWorkspaceBusiness);

  const q = useQuery({
    queryKey: ["workspace-business", businessId, user?.id],
    enabled: !!user?.id,
    queryFn: () => load({ data: { businessId } }),
  });

  const loadUsage = useServerFn(getBusinessPlanUsage);
  const usageQ = useQuery({
    queryKey: ["business-plan-usage", businessId],
    enabled: !!q.data?.business?.id,
    queryFn: () => loadUsage({ data: { businessId } }),
  });

  if (loading || (user && q.isLoading)) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container mx-auto p-8 text-center">
        <p className="mb-4">Sign in to open this workspace.</p>
        <Button asChild>
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-lg font-semibold mb-2">Workspace not available</h2>
        <p className="text-muted-foreground mb-4">
          You don't have access to this business workspace, or it doesn't exist.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard/businesses">Back to my businesses</Link>
        </Button>
      </div>
    );
  }

  const { business, role } = q.data;

  const usage = usageQ.data;
  const tone =
    usage?.status === "past_due"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-primary/30 bg-primary/5 text-foreground";

  return (
    <WorkspaceNotificationsProvider businessId={business.id}>
      <div className="container mx-auto p-2 md:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
          <div className="text-sm text-muted-foreground truncate">
            <span className="font-medium text-foreground">{business.name}</span> workspace
          </div>
          <div className="flex items-center gap-2">
            {usage && (
              <Link
                to="/dashboard/business/$businessId/billing"
                params={{ businessId: business.id }}
                className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium hover:opacity-90 ${tone}`}
              >
                <span className="capitalize">Plan: {usage.tier}</span>
                {usage.daysRemaining != null && (
                  <span className="opacity-80">· {usage.daysRemaining}d left</span>
                )}
              </Link>
            )}
            <WorkspaceNotificationBell />
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <WorkspaceSidebar
            businessId={business.id}
            businessName={business.name}
            businessKind={business.type_slug}
            role={role as any}
          />
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </WorkspaceNotificationsProvider>
  );
}

