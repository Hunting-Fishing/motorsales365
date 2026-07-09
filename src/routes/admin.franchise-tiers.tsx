import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  adminListTiers,
  adminUpsertTier,
  type FranchiseTier,
} from "@/lib/franchise.functions";

export const Route = createFileRoute("/admin/franchise-tiers")({
  head: () => ({
    meta: [{ title: "Franchise Tiers — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminTiersPage,
});

function AdminTiersPage() {
  const listFn = useServerFn(adminListTiers);
  const upsertFn = useServerFn(adminUpsertTier);
  const { data: tiers = [], refetch } = useQuery({
    queryKey: ["admin", "franchise-tiers"],
    queryFn: () => listFn(),
  });

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Franchise tiers</h1>
        <p className="text-sm text-muted-foreground">
          Edit the tiers shown on the public /franchise page.
        </p>
        <div className="mt-6 space-y-4">
          {tiers.map((t) => (
            <TierEditor
              key={t.id}
              tier={t}
              onSave={async (payload) => {
                await upsertFn({ data: payload });
                toast.success("Tier saved");
                refetch();
              }}
            />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

function TierEditor({
  tier,
  onSave,
}: {
  tier: FranchiseTier;
  onSave: (payload: FranchiseTier) => Promise<void>;
}) {
  const [state, setState] = useState<FranchiseTier>(tier);
  useEffect(() => setState(tier), [tier]);
  const set = <K extends keyof FranchiseTier>(k: K, v: FranchiseTier[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  return (
    <Card className="p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Slug</Label>
          <Input value={state.slug} disabled />
        </div>
        <div>
          <Label>Name</Label>
          <Input value={state.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Tagline</Label>
          <Input value={state.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div>
          <Label>Monthly fee (₱)</Label>
          <Input
            type="number"
            value={state.monthly_fee_cents / 100}
            onChange={(e) => set("monthly_fee_cents", Math.round(Number(e.target.value) * 100))}
          />
        </div>
        <div>
          <Label>Setup fee (₱)</Label>
          <Input
            type="number"
            value={state.setup_fee_cents / 100}
            onChange={(e) => set("setup_fee_cents", Math.round(Number(e.target.value) * 100))}
          />
        </div>
        <div>
          <Label>Parts discount (%)</Label>
          <Input
            type="number"
            value={state.parts_discount_bps / 100}
            onChange={(e) => set("parts_discount_bps", Math.round(Number(e.target.value) * 100))}
          />
        </div>
        <div>
          <Label>Ad discount (%)</Label>
          <Input
            type="number"
            value={state.ad_discount_bps / 100}
            onChange={(e) => set("ad_discount_bps", Math.round(Number(e.target.value) * 100))}
          />
        </div>
        <label className="flex items-center gap-2">
          <Switch
            checked={state.includes_shop_manager}
            onCheckedChange={(v) => set("includes_shop_manager", v)}
          />
          <span className="text-sm">Includes Shop Manager</span>
        </label>
        <label className="flex items-center gap-2">
          <Switch
            checked={state.includes_inventory}
            onCheckedChange={(v) => set("includes_inventory", v)}
          />
          <span className="text-sm">Includes Inventory</span>
        </label>
        <label className="flex items-center gap-2">
          <Switch
            checked={state.includes_shared_crm}
            onCheckedChange={(v) => set("includes_shared_crm", v)}
          />
          <span className="text-sm">Includes Shared CRM</span>
        </label>
        <label className="flex items-center gap-2">
          <Switch
            checked={state.is_active}
            onCheckedChange={(v) => set("is_active", v)}
          />
          <span className="text-sm">Active (public)</span>
        </label>
        <div className="sm:col-span-2">
          <Label>Branding rights</Label>
          <Textarea
            rows={2}
            value={state.branding_rights ?? ""}
            onChange={(e) => set("branding_rights", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Features (one per line)</Label>
          <Textarea
            rows={6}
            value={(state.features ?? []).join("\n")}
            onChange={(e) =>
              set(
                "features",
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={() => onSave(state)}>Save</Button>
      </div>
    </Card>
  );
}
