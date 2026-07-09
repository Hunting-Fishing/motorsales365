import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  adminListApplications,
  adminGetApplication,
  adminDecideApplication,
  adminBulkApproveApplications,
  listActiveTiers,
  type FranchiseApplication,
} from "@/lib/franchise.functions";

export const Route = createFileRoute("/admin/franchise")({
  head: () => ({
    meta: [{ title: "Franchise Applications — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminFranchisePage,
});

const STATUSES = ["all", "pending", "in_review", "info_requested", "approved", "rejected"] as const;

function AdminFranchisePage() {
  const listFn = useServerFn(adminListApplications);
  const getFn = useServerFn(adminGetApplication);
  const decideFn = useServerFn(adminDecideApplication);
  const bulkApproveFn = useServerFn(adminBulkApproveApplications);
  const tiersFn = useServerFn(listActiveTiers);

  const tiersQuery = useQuery({
    queryKey: ["franchise", "tiers", "active"],
    queryFn: () => tiersFn(),
  });
  const tierOptions = tiersQuery.data ?? [];

  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["admin", "franchise", status, search],
    queryFn: () =>
      listFn({
        data: {
          status: status === "all" ? null : status,
          search: search || null,
          limit: 200,
        },
      }),
  });

  const detail = useQuery({
    queryKey: ["admin", "franchise", "detail", openId],
    queryFn: () => (openId ? getFn({ data: { id: openId } }) : Promise.resolve(null)),
    enabled: !!openId,
  });

  const [tier, setTier] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // ---- Bulk selection state ----
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [rowTier, setRowTier] = useState<Record<string, string>>({});
  const [bulkTier, setBulkTier] = useState<string>("");
  const [bulkBusy, setBulkBusy] = useState(false);

  // Only pending / in_review / info_requested rows are approvable.
  const approvable = useMemo(
    () => rows.filter((r) => r.status !== "approved" && r.status !== "rejected"),
    [rows],
  );
  const approvableIds = useMemo(() => approvable.map((r) => r.id), [approvable]);
  const selectedIds = useMemo(
    () => approvableIds.filter((id) => selected[id]),
    [approvableIds, selected],
  );
  const allSelected = approvableIds.length > 0 && selectedIds.length === approvableIds.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) for (const id of approvableIds) next[id] = true;
    setSelected(next);
  };

  const tierFor = (r: FranchiseApplication) =>
    rowTier[r.id] ??
    r.assigned_tier_slug ??
    r.tier_slug ??
    bulkTier ??
    tierOptions[0]?.slug ??
    "";

  const applyBulkTierToSelected = () => {
    if (!bulkTier) {
      toast.error("Pick a tier to apply.");
      return;
    }
    const next = { ...rowTier };
    for (const id of selectedIds) next[id] = bulkTier;
    setRowTier(next);
    toast.success(`Applied "${bulkTier}" to ${selectedIds.length} row(s).`);
  };

  const bulkApprove = async () => {
    if (selectedIds.length === 0) return;
    const items = selectedIds.map((id) => {
      const row = approvable.find((r) => r.id === id)!;
      return { id, assigned_tier_slug: tierFor(row) };
    });
    const missing = items.filter((i) => !i.assigned_tier_slug);
    if (missing.length > 0) {
      toast.error(`${missing.length} row(s) still need a tier.`);
      return;
    }
    setBulkBusy(true);
    try {
      const { results } = await bulkApproveFn({ data: { items } });
      const ok = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (ok > 0) toast.success(`Approved ${ok} application(s).`);
      if (failed.length > 0) {
        toast.error(
          `Failed ${failed.length}: ${failed
            .slice(0, 3)
            .map((f) => f.error)
            .join("; ")}${failed.length > 3 ? "…" : ""}`,
        );
      }
      setSelected({});
      setRowTier({});
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Bulk approve failed");
    } finally {
      setBulkBusy(false);
    }
  };


  const decide = async (decision: "approve" | "reject" | "request_info" | "in_review") => {
    if (!openId) return;
    if (decision === "approve" && !tier) {
      toast.error("Select a tier before approving.");
      return;
    }
    setBusy(true);
    try {
      await decideFn({
        data: {
          id: openId,
          decision,
          assigned_tier_slug: decision === "approve" ? tier : null,
          reviewer_notes: notes || null,
          message_to_applicant: message || null,
        },
      });
      toast.success(`Application ${decision === "approve" ? "approved" : decision}.`);
      setNotes("");
      setMessage("");
      setOpenId(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Franchise applications</h1>
            <p className="text-sm text-muted-foreground">
              Review and decide on Partner and Franchise applications.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/admin/franchise-tiers">Manage tiers →</a>
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
            <TabsList>
              {STATUSES.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {s.replace("_", " ")}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search name / business / email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {approvable.length > 0 ? (
          <Card className="mt-6 flex flex-wrap items-center gap-3 border-primary/30 bg-primary/5 p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(v) => toggleAll(v === true)}
                aria-label="Select all approvable"
              />
              <span>
                {selectedIds.length > 0
                  ? `${selectedIds.length} selected`
                  : `Select approvable (${approvable.length})`}
              </span>
            </label>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Select
                value={bulkTier}
                onValueChange={setBulkTier}
                disabled={tierOptions.length === 0}
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder="Bulk tier…" />
                </SelectTrigger>
                <SelectContent>
                  {tierOptions.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={applyBulkTierToSelected}
                disabled={selectedIds.length === 0 || !bulkTier}
              >
                Apply to selected
              </Button>
              <Button
                size="sm"
                onClick={bulkApprove}
                disabled={selectedIds.length === 0 || bulkBusy}
              >
                {bulkBusy ? "Approving…" : `Approve ${selectedIds.length || ""}`.trim()}
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="mt-4 space-y-2">
          {rows.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">No applications found.</Card>
          ) : (
            rows.map((r: FranchiseApplication) => {
              const isApprovable = r.status !== "approved" && r.status !== "rejected";
              const isSelected = !!selected[r.id];
              return (
                <Card
                  key={r.id}
                  className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 hover:bg-secondary/30 ${
                    isSelected ? "border-primary/60 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center">
                    {isApprovable ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(v) =>
                          setSelected((prev) => ({ ...prev, [r.id]: v === true }))
                        }
                        aria-label={`Select ${r.business_name}`}
                      />
                    ) : (
                      <span className="inline-block h-4 w-4" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(r.id);
                      setTier(
                        rowTier[r.id] ??
                          r.assigned_tier_slug ??
                          r.tier_slug ??
                          tierOptions[0]?.slug ??
                          "",
                      );
                      setNotes(r.reviewer_notes ?? "");
                    }}
                    className="min-w-0 text-left"
                  >
                    <p className="truncate font-semibold">{r.business_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {r.contact_name} · {r.contact_email} ·{" "}
                      {[r.city, r.province].filter(Boolean).join(", ") || "—"}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {isApprovable && isSelected ? (
                      <Select
                        value={tierFor(r)}
                        onValueChange={(v) => setRowTier((prev) => ({ ...prev, [r.id]: v }))}
                        disabled={tierOptions.length === 0}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs">
                          <SelectValue placeholder="Tier…" />
                        </SelectTrigger>
                        <SelectContent>
                          {tierOptions.map((t) => (
                            <SelectItem key={t.slug} value={t.slug}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{r.tier_slug}</Badge>
                    )}
                    <Badge>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>


      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Review application</SheetTitle>
            <SheetDescription>
              {detail.data?.application?.business_name ?? ""}
            </SheetDescription>
          </SheetHeader>
          {detail.data?.application ? (
            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <Info label="Contact" value={detail.data.application.contact_name} />
                <Info label="Email" value={detail.data.application.contact_email} />
                <Info label="Phone" value={detail.data.application.contact_phone ?? "—"} />
                <Info label="Shop type" value={detail.data.application.shop_type ?? "—"} />
                <Info
                  label="Location"
                  value={
                    [detail.data.application.city, detail.data.application.province]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
                <Info
                  label="Years"
                  value={String(detail.data.application.years_in_business ?? "—")}
                />
                <Info label="Staff" value={String(detail.data.application.staff_count ?? "—")} />
                <Info
                  label="Monthly parts spend"
                  value={
                    detail.data.application.monthly_parts_spend_cents
                      ? `₱${(detail.data.application.monthly_parts_spend_cents / 100).toLocaleString()}`
                      : "—"
                  }
                />
                <Info label="Website" value={detail.data.application.website_url ?? "—"} />
                <Info label="Requested tier" value={detail.data.application.tier_slug} />
              </div>
              {detail.data.application.notes ? (
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Applicant notes</p>
                  <p className="mt-1 whitespace-pre-wrap">{detail.data.application.notes}</p>
                </div>
              ) : null}

              <div>
                <p className="text-xs uppercase text-muted-foreground">Assign tier on approval</p>
                <Select
                  value={tier}
                  onValueChange={setTier}
                  disabled={tiersQuery.isLoading || tierOptions.length === 0}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue
                      placeholder={
                        tiersQuery.isLoading
                          ? "Loading tiers…"
                          : tierOptions.length === 0
                            ? "No active tiers configured"
                            : "Select a tier"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {tierOptions.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tierOptions.length === 0 && !tiersQuery.isLoading ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <a href="/admin/franchise-tiers" className="underline">
                      Configure franchise tiers
                    </a>{" "}
                    before approving applications.
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground">Reviewer notes (private)</p>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Message to applicant (optional)
                </p>
                <Textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => decide("approve")} disabled={busy}>
                  Approve
                </Button>
                <Button
                  onClick={() => decide("reject")}
                  disabled={busy}
                  variant="destructive"
                >
                  Reject
                </Button>
                <Button onClick={() => decide("in_review")} disabled={busy} variant="outline">
                  Mark in review
                </Button>
                <Button
                  onClick={() => decide("request_info")}
                  disabled={busy}
                  variant="outline"
                >
                  Request info
                </Button>
              </div>

              <div>
                <p className="text-xs uppercase text-muted-foreground">Thread</p>
                <div className="mt-2 space-y-2">
                  {detail.data.messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages.</p>
                  ) : (
                    detail.data.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`rounded border p-2 text-sm ${
                          m.is_internal ? "border-primary/40 bg-primary/5" : ""
                        }`}
                      >
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleString()}
                          {m.is_internal ? " · internal" : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          )}
        </SheetContent>
      </Sheet>
    </SiteLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words">{value}</p>
    </div>
  );
}
