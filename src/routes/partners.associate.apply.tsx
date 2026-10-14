import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, MapPin, Network } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import {
  applyForAssociateNetwork,
  getAssociateEnrollmentContext,
} from "@/lib/associate-enrollment.functions";

export const Route = createFileRoute("/partners/associate/apply")({
  component: AssociateApplyPage,
  head: () => ({
    meta: [
      { title: "Join the 365 Associate Network" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const TRACKS = [
  {
    id: "parts_supplier",
    label: "Parts supplier",
    help: "Publish approved inventory and fulfil nearby shop orders.",
  },
  {
    id: "repair_shop",
    label: "Repair shop",
    help: "Use Shop Manager and source parts from connected Associates.",
  },
  {
    id: "both",
    label: "Parts + repair",
    help: "Operate both sides of the network from one business workspace.",
  },
] as const;

function AssociateApplyPage() {
  const { user, loading } = useAuth();
  const load = useServerFn(getAssociateEnrollmentContext);
  const apply = useServerFn(applyForAssociateNetwork);
  const qc = useQueryClient();
  const [businessId, setBusinessId] = useState("");
  const [track, setTrack] = useState<(typeof TRACKS)[number]["id"]>("parts_supplier");
  const [accepted, setAccepted] = useState(false);
  const query = useQuery({
    queryKey: ["associate-enrollment", user?.id],
    enabled: !!user,
    queryFn: () => load(),
  });
  const mutation = useMutation({
    mutationFn: () => apply({ data: { businessId, track, acceptTerms: true as const } }),
    onSuccess: () => {
      toast.success("Associate application submitted");
      qc.invalidateQueries({ queryKey: ["associate-enrollment"] });
    },
    onError: (error: any) => toast.error(error?.message ?? "Application could not be submitted"),
  });

  if (loading)
    return (
      <SiteLayout>
        <div className="container mx-auto p-10">
          <Loader2 className="animate-spin" />
        </div>
      </SiteLayout>
    );
  if (!user)
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-2xl px-4 py-12">
          <Card className="p-7 text-center">
            <Network className="mx-auto h-10 w-10 text-amber-500" />
            <h1 className="mt-3 text-2xl font-bold">Connect your business to 365</h1>
            <p className="mt-2 text-muted-foreground">
              Existing users can sign in. New business owners create an account first, then return
              here automatically.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button asChild>
                <Link to="/login" search={{ redirect: "/partners/associate/apply" } as any}>
                  Sign in
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  to="/signup"
                  search={{ type: "business", redirect: "/partners/associate/apply" }}
                >
                  Create business account
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </SiteLayout>
    );
  const businesses = query.data?.businesses ?? [];
  const applications = query.data?.applications ?? [];
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6">
          <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-700">
            365 Associate enrollment
          </span>
          <h1 className="mt-3 text-3xl font-bold">Join with an existing business</h1>
          <p className="mt-2 text-muted-foreground">
            Approval connects the business workspace, inventory, Shop Manager, map identity and
            parts network. It does not expose private costs or customer records.
          </p>
        </div>
        {query.isLoading ? (
          <Loader2 className="animate-spin" />
        ) : businesses.length === 0 ? (
          <Card className="p-7 text-center">
            <CircleAlert className="mx-auto h-8 w-8 text-amber-500" />
            <h2 className="mt-2 font-semibold">List or claim your business first</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The application must be tied to a business you own or manage.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild>
                <Link to="/businesses/submit">List a business</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/claim-business">Claim existing business</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            {applications.length > 0 && (
              <Card className="p-4">
                <h2 className="font-semibold">Current applications</h2>
                <div className="mt-2 space-y-2">
                  {applications.map((a: any) => {
                    const b = businesses.find((x: any) => x.id === a.business_id);
                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm"
                      >
                        <span>{b?.name ?? "Business"}</span>
                        <span
                          className={
                            a.status === "approved"
                              ? "font-semibold text-emerald-600"
                              : "capitalize text-muted-foreground"
                          }
                        >
                          {a.status === "approved" ? "✓ Approved Associate" : a.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
            <Card className="space-y-5 p-6">
              <div>
                <label className="text-sm font-medium">Business</label>
                <select
                  className="mt-1 w-full rounded-md border bg-background p-2"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                >
                  <option value="">Select your business</option>
                  {businesses.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {[b.city, b.province].filter(Boolean).join(", ") || b.type_slug}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Associate track</label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {TRACKS.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setTrack(t.id)}
                      className={`rounded-lg border p-3 text-left ${track === t.id ? "border-amber-500 bg-amber-500/10" : "border-border"}`}
                    >
                      <span className="font-semibold">{t.label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{t.help}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
                <span>
                  I agree to accurate inventory, fitment, order, return and warranty information;
                  lawful use of customer data; and 365 Associate review and suspension policies.
                </span>
              </label>
              <Button
                className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
                disabled={!businessId || !accepted || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Submit for Associate review
              </Button>
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> The gold map ring appears only after approval.
              </p>
            </Card>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
