import { createFileRoute, Outlet, useParams, Link } from "@tanstack/react-router";
import { BadgeCheck, RotateCcw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getWorkspaceBusiness } from "@/lib/business-workspace.functions";
import { resetTowDemoWorkspace } from "@/lib/business-workspace.functions";
import { getBusinessPlanUsage } from "@/lib/business-plan-usage.functions";
import { WorkspaceSidebar } from "@/components/business-workspace/sidebar";
import { WorkspaceNotificationsProvider } from "@/components/business-workspace/notifications-provider";
import { WorkspaceNotificationBell } from "@/components/business-workspace/notification-bell";
import { WorkspacePlanWarnings } from "@/components/business-workspace/plan-warnings";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const resetDemo = useServerFn(resetTowDemoWorkspace);

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
  const associateQ = useQuery({
    queryKey: ["business-associate-status", businessId],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_associate_applications" as any)
        .select("status")
        .eq("business_id", businessId)
        .maybeSingle();
      if (error) throw error;
      return (data as any)?.status as string | undefined;
    },
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
  const isDemo = (business as any).import_metadata?.demo_template === "tow-company-v1";

  async function handleDemoReset() {
    if (!confirm("Restore the demo fleet and inventory baseline? Your own untagged records will remain.")) return;
    try {
      await resetDemo({ data: { businessId } });
      toast.success("Demo fleet and inventory restored");
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.message || "Could not reset demo workspace");
    }
  }

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
            <AssociateWorkspaceBadge status={associateQ.data} />
            {isDemo && (
              <span className="ml-2 inline-flex rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                Playground
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDemo && role === "owner" && (
              <Button size="sm" variant="outline" onClick={handleDemoReset}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset demo
              </Button>
            )}
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
            associateApproved={associateQ.data === "approved"}
          />
          <main className="flex-1 min-w-0">
            <WorkspacePlanWarnings businessId={business.id} usage={usage} />
            <Outlet />
          </main>
        </div>
      </div>
    </WorkspaceNotificationsProvider>
  );
}

function AssociateWorkspaceBadge({ status }: { status?: string }) {
  if (status === "approved") {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
        <BadgeCheck className="h-3 w-3" /> 365 Associate
      </span>
    );
  }
  if (status === "submitted" || status === "reviewing") {
    return (
      <span className="ml-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Associate application pending
      </span>
    );
  }
  return (
    <Link
      to="/partners/associate/apply"
      className="ml-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-amber-500/50 hover:text-amber-700"
    >
      Not a 365 Associate · Apply
    </Link>
  );
}
