import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, MapPin, Network, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  adminListAssociateApplications,
  adminReviewAssociateApplication,
} from "@/lib/associate-enrollment.functions";

export const Route = createFileRoute("/admin/associate-applications")({
  component: AssociateApplicationsAdmin,
});

function AssociateApplicationsAdmin() {
  const list = useServerFn(adminListAssociateApplications);
  const review = useServerFn(adminReviewAssociateApplication);
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "associate-applications"], queryFn: () => list() });
  const mutation = useMutation({
    mutationFn: (input: {
      applicationId: string;
      status: "reviewing" | "approved" | "rejected" | "suspended";
    }) => review({ data: input }),
    onSuccess: () => {
      toast.success("Associate status updated");
      qc.invalidateQueries({ queryKey: ["admin", "associate-applications"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Review failed"),
  });
  const rows = (query.data ?? []) as any[];
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Network className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Associate applications</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve only verified businesses. Approval activates the public gold-ring identity;
          suspension removes it immediately without deleting the business.
        </p>
      </div>
      {query.isLoading ? (
        <Loader2 className="animate-spin" />
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No Associate applications yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const b = a.businesses;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{b?.name ?? "Unknown business"}</h2>
                      <Badge variant="outline" className="capitalize">
                        {a.status}
                      </Badge>
                      <Badge className="bg-amber-400/15 text-amber-800 hover:bg-amber-400/20 dark:text-amber-300">
                        {String(a.track).replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {[b?.city, b?.province].filter(Boolean).join(", ") || "Location incomplete"} ·
                      Submitted {new Date(a.submitted_at).toLocaleDateString()}
                    </p>
                    {b?.slug && (
                      <Link
                        className="mt-2 inline-block text-xs text-primary underline"
                        to="/businesses/$slug"
                        params={{ slug: b.slug }}
                      >
                        Open public business page
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ applicationId: a.id, status: "reviewing" })}
                    >
                      Reviewing
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-500 text-amber-950 hover:bg-amber-400"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate({ applicationId: a.id, status: "approved" })}
                    >
                      <BadgeCheck className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    {a.status === "approved" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({ applicationId: a.id, status: "suspended" })
                        }
                      >
                        <ShieldX className="mr-1 h-4 w-4" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ applicationId: a.id, status: "rejected" })}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
