import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminListPartnerProgramApplications,
  adminUpdatePartnerProgramApplication,
} from "@/lib/partner-program.functions";

export const Route = createFileRoute("/admin/partner-program")({
  component: AdminPartnerProgram,
});

function AdminPartnerProgram() {
  const listFn = useServerFn(adminListPartnerProgramApplications);
  const updateFn = useServerFn(adminUpdatePartnerProgramApplication);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "partner-program", "apps"],
    queryFn: () => listFn({}),
  });

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await updateFn({ data: { id, status } });
      toast.success(`Application ${status}.`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update.");
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Partner Program applications</h1>
        <p className="text-sm text-muted-foreground">
          Review and approve independent partner applications.
        </p>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p>Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <p className="text-muted-foreground">No applications yet.</p>
          ) : (
            (data ?? []).map((a: any) => (
              <Card key={a.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{a.full_name}</p>
                      <Badge variant="outline" className="capitalize">{a.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {a.email} · {a.phone ?? "—"} · {[a.city, a.region].filter(Boolean).join(", ") || "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.channel_type} · {(a.platforms ?? []).join(", ") || "—"} · {a.audience_band ?? "—"}
                    </p>
                    {a.pitch && <p className="mt-2 text-sm">{a.pitch}</p>}
                  </div>
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "rejected")}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => setStatus(a.id, "approved")}>
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
