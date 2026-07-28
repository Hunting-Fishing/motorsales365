import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  adminListPartnerProgramApplications,
  adminUpdatePartnerProgramApplication,
  adminApproveAffiliate,
} from "@/lib/partner-program.functions";

export const Route = createFileRoute("/admin/partner-program")({
  component: AdminPartnerProgram,
});

type ApproveState = { shopManager: boolean; signup: string; business: string };

function AdminPartnerProgram() {
  const listFn = useServerFn(adminListPartnerProgramApplications);
  const updateFn = useServerFn(adminUpdatePartnerProgramApplication);
  const approveFn = useServerFn(adminApproveAffiliate);
  const [draft, setDraft] = useState<Record<string, ApproveState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["admin", "partner-program", "apps"],
    queryFn: () => listFn({}),
  });

  const stateFor = (a: any): ApproveState =>
    draft[a.id] ?? {
      shopManager: !!a.wants_shop_manager,
      signup: "2",
      business: "10",
    };
  const patch = (id: string, p: Partial<ApproveState>, a: any) =>
    setDraft((d) => ({ ...d, [id]: { ...stateFor(a), ...p } }));

  const reject = async (id: string) => {
    try {
      await updateFn({ data: { id, status: "rejected" } });
      toast.success("Application rejected.");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update.");
    }
  };

  const approve = async (a: any) => {
    const s = stateFor(a);
    setBusy(a.id);
    try {
      const res: any = await approveFn({
        data: {
          applicationId: a.id,
          shopManagerAccess: s.shopManager,
          signupBounty: Number(s.signup) || 0,
          businessBounty: Number(s.business) || 0,
        },
      });
      toast.success(`Approved. Referral code: ${res?.referralCode ?? "—"}`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to approve.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Affiliate applications</h1>
            <p className="text-sm text-muted-foreground">
              Review and approve independent affiliate partners. Approving issues a referral code
              and QR immediately.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/admin/partner-program/ledger">Commission ledger →</a>
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            <p>Loading…</p>
          ) : (data ?? []).length === 0 ? (
            <p className="text-muted-foreground">No applications yet.</p>
          ) : (
            (data ?? []).map((a: any) => {
              const s = stateFor(a);
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{a.full_name}</p>
                        <Badge variant="outline" className="capitalize">{a.status}</Badge>
                        {a.wants_shop_manager && (
                          <Badge variant="secondary">Requested Shop Manager</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.email} · {a.phone ?? "—"} ·{" "}
                        {[a.city, a.region].filter(Boolean).join(", ") || "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.channel_type} · {(a.platforms ?? []).join(", ") || "—"} ·{" "}
                        {a.audience_band ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Payout: {a.payout_method ?? "—"}
                        {a.payout_account_name ? ` · ${a.payout_account_name}` : ""}
                        {a.payout_account_number ? ` · ${a.payout_account_number}` : ""}
                      </p>
                      {(a.occupation || a.school_or_company) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[a.occupation, a.school_or_company].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {a.pitch && <p className="mt-2 text-sm">{a.pitch}</p>}
                    </div>

                    {a.status === "pending" && (
                      <div className="w-full max-w-xs space-y-3 rounded-md border border-border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-xs">Free Shop Manager access</Label>
                          <Switch
                            checked={s.shopManager}
                            onCheckedChange={(v) => patch(a.id, { shopManager: v }, a)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">₱ / sign-up</Label>
                            <Input
                              inputMode="decimal"
                              value={s.signup}
                              onChange={(e) => patch(a.id, { signup: e.target.value }, a)}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">₱ / business</Label>
                            <Input
                              inputMode="decimal"
                              value={s.business}
                              onChange={(e) => patch(a.id, { business: e.target.value }, a)}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => reject(a.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={busy === a.id}
                            onClick={() => approve(a)}
                          >
                            {busy === a.id ? "Approving…" : "Approve"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
