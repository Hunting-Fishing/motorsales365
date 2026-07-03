import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgePercent, Loader2, Save, RefreshCw } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getClubDiscountAdminConfig,
  updateClubDiscountAdminConfig,
} from "@/lib/club-discount-admin.functions";

type CouponDuration = "auto" | "once" | "forever";

export const Route = createFileRoute("/admin/club-discount")({
  head: () => ({
    meta: [
      { title: "Admin — Club discount settings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubDiscountAdminPage,
});

function ClubDiscountAdminPage() {
  const getFn = useServerFn(getClubDiscountAdminConfig);
  const saveFn = useServerFn(updateClubDiscountAdminConfig);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "club-discount-config"],
    queryFn: () => getFn(),
  });

  const [enabled, setEnabled] = useState(false);
  const [pct, setPct] = useState(5);
  const [couponDuration, setCouponDuration] = useState<CouponDuration>("auto");
  const [requireVerified, setRequireVerified] = useState(true);
  const [includePendingClubs, setIncludePendingClubs] = useState(false);
  const [includePendingMembers, setIncludePendingMembers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setPct(data.pct);
    setCouponDuration(data.couponDuration);
    setRequireVerified(data.requireVerified);
    setIncludePendingClubs(data.includePendingClubs);
    setIncludePendingMembers(data.includePendingMembers);
  }, [data]);

  const save = async () => {
    setSaving(true);
    try {
      const next = await saveFn({
        data: {
          enabled,
          pct: Number(pct) || 0,
          couponDuration,
          requireVerified,
          includePendingClubs,
          includePendingMembers,
        },
      });
      toast.success("Club discount settings saved.");
      // update local state from server response
      setEnabled(next.enabled);
      setPct(next.pct);
      setCouponDuration(next.couponDuration);
      setRequireVerified(next.requireVerified);
      setIncludePendingClubs(next.includePendingClubs);
      setIncludePendingMembers(next.includePendingMembers);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <BadgePercent className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Club discount settings</h1>
              <p className="text-sm text-muted-foreground">
                Configure the 5% (or custom %) discount for members of accredited clubs on internal
                365 purchases — ads, boosts, bundles, subscription tiers, and Passport Premium.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Reload
            </Button>
            <Button size="sm" asChild variant="outline">
              <Link to="/admin/discount-audits">View audits</Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border p-8 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load settings: {(error as Error).message}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Global switch + rate */}
            <section className="rounded-lg border p-4 space-y-4">
              <h2 className="font-semibold">Discount rule</h2>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base">Enable club-member discount</Label>
                  <p className="text-sm text-muted-foreground">
                    When off, no club discount is applied anywhere on checkout.
                  </p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>
              <div className="grid gap-2 max-w-xs">
                <Label htmlFor="pct">Discount percent</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="pct"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={pct}
                    onChange={(e) => setPct(Number(e.target.value))}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applies only to 365-controlled purchases. Never stacks with the multi-business
                  discount — that one always wins.
                </p>
              </div>
            </section>

            {/* Eligibility */}
            <section className="rounded-lg border p-4 space-y-4">
              <h2 className="font-semibold">Eligible club statuses</h2>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base">Require verified club</Label>
                  <p className="text-sm text-muted-foreground">
                    Only clubs marked <Badge variant="secondary">verified</Badge> qualify their
                    members. Turn off to include any active club (not recommended in production).
                  </p>
                </div>
                <Switch checked={requireVerified} onCheckedChange={setRequireVerified} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base">Include pending clubs</Label>
                  <p className="text-sm text-muted-foreground">
                    Grant the discount to members of clubs still in <Badge variant="outline">pending</Badge>{" "}
                    review. Default off.
                  </p>
                </div>
                <Switch checked={includePendingClubs} onCheckedChange={setIncludePendingClubs} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label className="text-base">Include pending memberships</Label>
                  <p className="text-sm text-muted-foreground">
                    Grant the discount to users whose membership is still <Badge variant="outline">pending</Badge>{" "}
                    (not yet accepted by the club admin). Default off.
                  </p>
                </div>
                <Switch checked={includePendingMembers} onCheckedChange={setIncludePendingMembers} />
              </div>
            </section>

            {/* Stripe coupon behavior */}
            <section className="rounded-lg border p-4 space-y-4">
              <h2 className="font-semibold">Stripe coupon behavior</h2>
              <div className="grid gap-2 max-w-md">
                <Label>Coupon duration</Label>
                <Select value={couponDuration} onValueChange={(v) => setCouponDuration(v as CouponDuration)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto — once for one-time, forever for subscriptions</SelectItem>
                    <SelectItem value="once">Once — single invoice only</SelectItem>
                    <SelectItem value="forever">Forever — every renewal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Applied as a Stripe <code>percent_off</code> coupon at checkout. This affects new
                  checkouts only — existing subscriptions keep the coupon they were created with.
                </p>
              </div>
            </section>

            <div className="flex justify-end gap-2 sticky bottom-4">
              <Button onClick={save} disabled={saving} size="lg">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save settings
              </Button>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
