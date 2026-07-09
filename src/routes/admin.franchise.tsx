import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
  adminListApplications,
  adminGetApplication,
  adminDecideApplication,
  adminBulkApproveApplications,
  listActiveTiers,
  type FranchiseApplication,
} from "@/lib/franchise.functions";
import { ApplicationAuditTrail } from "@/components/franchise/ApplicationAuditTrail";

export const Route = createFileRoute("/admin/franchise")({
  head: () => ({
    meta: [{ title: "Franchise Applications — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminFranchisePage,
});

const STATUSES = ["all", "pending", "in_review", "info_requested", "approved", "rejected"] as const;

function formatStatus(status: string) {
  if (status === "all") return "All statuses";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPageNumbers(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < totalPages - 2) pages.push("ellipsis");
  if (totalPages > 1) pages.push(totalPages);
  return pages;
}

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
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // ---- Sorting (server-side) ----
  type SortField = "business_name" | "contact_name" | "city" | "province" | "tier_slug" | "status" | "created_at";
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({
    field: "created_at",
    dir: "desc",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const offset = (page - 1) * pageSize;

  // Reset pagination when filters or search change.
  useEffect(() => {
    setPage(1);
  }, [status, tierFilter, search]);

  const {
    data: listData,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["admin", "franchise", status, search, tierFilter, page, pageSize, sort.field, sort.dir],
    queryFn: () =>
      listFn({
        data: {
          status: status === "all" ? null : status,
          tier: tierFilter === "all" ? null : tierFilter,
          search: search || null,
          limit: pageSize,
          offset,
          sortField: sort.field,
          sortDir: sort.dir,
        },
      }),
  });

  const rows = listData?.rows ?? [];
  const total = listData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatus(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tier</span>
            <Select value={tierFilter} onValueChange={setTierFilter} disabled={tierOptions.length === 0}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Requested</SelectLabel>
                  <SelectItem value="requested_only">Requested only</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Assigned</SelectLabel>
                  {tierOptions.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Search business, contact, or location"
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

        <Card className="mt-4 overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading applications…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No applications found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="w-10 px-3 py-2">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
                          onCheckedChange={(v) => toggleAll(v === true)}
                          aria-label="Select all approvable"
                        />
                      </th>
                      <SortHeader field="business_name" sort={sort} setSort={setSort}>Business</SortHeader>
                      <SortHeader field="contact_name" sort={sort} setSort={setSort}>Contact</SortHeader>
                      <SortHeader field="province" sort={sort} setSort={setSort}>Location</SortHeader>
                      <SortHeader field="tier_slug" sort={sort} setSort={setSort}>Tier</SortHeader>
                      <SortHeader field="status" sort={sort} setSort={setSort}>Status</SortHeader>
                      <SortHeader field="created_at" sort={sort} setSort={setSort} align="right">Applied</SortHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: FranchiseApplication) => {
                      const isApprovable = r.status !== "approved" && r.status !== "rejected";
                      const isSelected = !!selected[r.id];
                      const effectiveTier = r.assigned_tier_slug ?? r.tier_slug;
                      const tierMeta = tierOptions.find((t) => t.slug === effectiveTier);
                      return (
                        <tr
                          key={r.id}
                          className={`border-b transition-colors last:border-0 hover:bg-secondary/40 ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="px-3 py-2 align-middle">
                            {isApprovable ? (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(v) =>
                                  setSelected((prev) => ({ ...prev, [r.id]: v === true }))
                                }
                                aria-label={`Select ${r.business_name}`}
                              />
                            ) : null}
                          </td>
                          <td className="px-3 py-2 align-middle">
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
                              className="text-left font-semibold hover:underline"
                            >
                              {r.business_name}
                            </button>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <div className="truncate">{r.contact_name}</div>
                            <div className="truncate text-xs text-muted-foreground">{r.contact_email}</div>
                          </td>
                          <td className="px-3 py-2 align-middle text-muted-foreground">
                            {[r.city, r.province].filter(Boolean).join(", ") || "—"}
                          </td>
                          <td className="px-3 py-2 align-middle">
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
                              <TierBadge slug={effectiveTier} name={tierMeta?.name} assigned={!!r.assigned_tier_slug} />
                            )}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="px-3 py-2 align-middle text-right text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
                  <div className="text-muted-foreground">
                    Showing {Math.min(total, (page - 1) * pageSize + 1)}–{Math.min(total, page * pageSize)} of {total}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    {getPageNumbers(page, totalPages).map((p, i) =>
                      p === "ellipsis" ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows</span>
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                      <SelectTrigger className="h-8 w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50, 100].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
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
                <p className="text-xs uppercase text-muted-foreground">Admin audit trail</p>
                <div className="mt-2">
                  <ApplicationAuditTrail applicationId={detail.data.application.id} />
                </div>
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

type SortField = "business_name" | "contact_name" | "city" | "province" | "tier_slug" | "status" | "created_at";

function SortHeader({
  field,
  sort,
  setSort,
  align = "left",
  children,
}: {
  field: SortField;
  sort: { field: SortField; dir: "asc" | "desc" };
  setSort: (s: { field: SortField; dir: "asc" | "desc" }) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = sort.field === field;
  const arrow = active ? (sort.dir === "asc" ? "▲" : "▼") : "";
  return (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() =>
          setSort({
            field,
            dir: active && sort.dir === "asc" ? "desc" : "asc",
          })
        }
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {children}
        <span className="text-[10px] opacity-70">{arrow || "↕"}</span>
      </button>
    </th>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  in_review: "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300",
  info_requested: "border-purple-300 bg-purple-50 text-purple-800 dark:bg-purple-500/10 dark:text-purple-300",
  approved: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  rejected: "border-red-300 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function TierBadge({ slug, name, assigned }: { slug: string | null; name?: string; assigned: boolean }) {
  if (!slug) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
        assigned
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-muted-foreground/20 bg-muted/40 text-muted-foreground"
      }`}
      title={assigned ? "Assigned tier" : "Requested tier"}
    >
      {name ?? slug}
      {assigned ? <span className="text-[9px] uppercase opacity-70">assigned</span> : null}
    </span>
  );
}
