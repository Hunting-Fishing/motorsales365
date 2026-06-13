import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  ExternalLink,
  Star,
  ShieldCheck,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  Megaphone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatPHP, formatDate } from "@/lib/format";
import {
  adminListListings,
  adminListingCategories,
  adminGetListingDetail,
  adminSetListingStatus,
  adminBulkSetListingStatus,
  adminMarkListingPaid,
} from "@/lib/admin-listings.functions";

export const Route = createFileRoute("/admin/listings")({
  component: AdminListings,
});

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "pending_payment", label: "Pending Payment" },
  { value: "pending_sale", label: "Pending Sale" },
  { value: "hidden", label: "Hidden" },
  { value: "sold", label: "Sold" },
  { value: "expired", label: "Expired" },
  { value: "draft", label: "Draft" },
] as const;

const STATUS_OPTIONS = [
  "draft",
  "pending_payment",
  "active",
  "pending_sale",
  "hidden",
  "sold",
  "expired",
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending Payment",
  active: "Active",
  pending_sale: "Pending Sale",
  hidden: "Hidden",
  sold: "Sold",
  expired: "Expired",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  active: "bg-emerald-600 text-white",
  pending_payment: "bg-amber-500 text-amber-950",
  pending_sale: "bg-blue-500 text-white",
  hidden: "bg-muted text-muted-foreground",
  sold: "bg-slate-700 text-white",
  expired: "border-red-200 bg-red-50 text-red-700",
  draft: "bg-muted text-muted-foreground",
};

function sellerName(p: any): string {
  if (!p) return "Unknown seller";
  return (
    p.business_name ||
    p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    "Unnamed"
  );
}

function AdminListings() {
  const [tab, setTab] = useState<string>("active");
  const [category, setCategory] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const listFn = useServerFn(adminListListings);
  const listCategoriesFn = useServerFn(adminListingCategories);
  const getDetailFn = useServerFn(adminGetListingDetail);
  const setStatusFn = useServerFn(adminSetListingStatus);
  const bulkSetStatusFn = useServerFn(adminBulkSetListingStatus);
  const markPaidFn = useServerFn(adminMarkListingPaid);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-listings", tab, category, search, page],
    queryFn: () =>
      listFn({
        data: {
          status: tab as any,
          category: category === "all" ? undefined : category,
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      }),
  });

  const { data: catData } = useQuery({
    queryKey: ["admin-listing-categories"],
    queryFn: () => listCategoriesFn(),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-listing-detail", detailId],
    queryFn: () => getDetailFn({ data: { id: detailId as string } }),
    enabled: !!detailId,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
    qc.invalidateQueries({ queryKey: ["admin-listing-detail"] });
  }

  async function changeStatus(id: string, status: string) {
    try {
      await setStatusFn({ data: { id, status: status as any } });
      toast.success(`Listing marked ${STATUS_LABELS[status] ?? status}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update status");
    }
  }

  async function applyBulk() {
    if (!bulkStatus || selected.size === 0) return;
    try {
      const ids = Array.from(selected);
      await bulkSetStatusFn({ data: { ids, status: bulkStatus as any } });
      toast.success(`${ids.length} listing(s) marked ${STATUS_LABELS[bulkStatus] ?? bulkStatus}`);
      setSelected(new Set());
      setBulkStatus("");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Bulk update failed");
    }
  }

  async function markPaid(paymentId: string, listingId: string, amount: number) {
    try {
      await markPaidFn({ data: { paymentId, listingId } });
      toast.success(`Payment confirmed (${formatPHP(amount)}), listing active`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to confirm payment");
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Listings moderation</h1>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(1);
          setSelected(new Set());
        }}
      >
        <TabsList className="h-auto flex-wrap">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search by title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              className="max-w-xs"
            />
            <Button variant="outline" onClick={runSearch}>
              <Search className="mr-1 h-4 w-4" />
              Search
            </Button>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(catData?.categories ?? []).map((c: any) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected.size > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1">
                <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder="Set status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!bulkStatus} onClick={applyBulk}>
                  Apply
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
          ) : items.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No listings.</Card>
          ) : (
            <div className="space-y-2">
              {items.map((l: any) => (
                <Card key={l.id} className="flex flex-wrap items-center gap-3 p-4">
                  <Checkbox
                    checked={selected.has(l.id)}
                    onCheckedChange={() => toggleSelected(l.id)}
                    aria-label="Select listing"
                  />
                  <button
                    type="button"
                    className="h-14 w-20 shrink-0 overflow-hidden rounded bg-secondary"
                    onClick={() => setDetailId(l.id)}
                  >
                    {l.cover_url ? (
                      <img src={l.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="truncate text-left font-medium hover:text-primary hover:underline"
                      onClick={() => setDetailId(l.id)}
                    >
                      {l.title}
                    </button>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatPHP(l.price_php)}</span>
                      <span>·</span>
                      <span>{formatDate(l.created_at)}</span>
                      <span>·</span>
                      <span className="capitalize">{l.category_slug}</span>
                      <span>·</span>
                      <span>{sellerName(l.seller)}</span>
                      {l.seller?.verification_status === "verified" && (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                        >
                          <ShieldCheck className="mr-0.5 h-2.5 w-2.5" /> verified
                        </Badge>
                      )}
                      {l.photo_count > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <ImageIcon className="h-3 w-3" />
                          {l.photo_count}
                        </span>
                      )}
                      {l.has_video && <Video className="h-3 w-3" />}
                      {l.boost_until_active && (
                        <Badge variant="outline" className="text-[10px]">
                          <Megaphone className="mr-0.5 h-2.5 w-2.5" /> boosted
                        </Badge>
                      )}
                      {l.openReportCount > 0 && (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-[10px] text-red-700"
                        >
                          <AlertTriangle className="mr-0.5 h-2.5 w-2.5" /> {l.openReportCount} report
                          {l.openReportCount > 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={STATUS_BADGE_CLASS[l.status] ?? ""}>
                      {STATUS_LABELS[l.status] ?? l.status}
                    </Badge>
                    {l.pendingPayment && (
                      <Button
                        size="sm"
                        onClick={() => markPaid(l.pendingPayment.id, l.id, l.pendingPayment.amount_php)}
                      >
                        Mark paid ({formatPHP(l.pendingPayment.amount_php)})
                      </Button>
                    )}
                    <Select value={l.status} onValueChange={(v) => changeStatus(l.id, v)}>
                      <SelectTrigger className="h-8 w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Link
                      to="/listing/$id"
                      params={{ id: l.id }}
                      target="_blank"
                      className="text-muted-foreground hover:text-primary"
                      title="View public listing"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {detailLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : detail ? (
            <ListingDetailPanel detail={detail} />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ListingDetailPanel({ detail }: { detail: any }) {
  const l = detail.listing;
  const seller = detail.seller;
  const reports = detail.reports ?? [];
  const photos = (l.listing_media ?? []).filter((m: any) => m.type === "photo");
  const boosted = !!l.boost_until && new Date(l.boost_until) > new Date();

  return (
    <div className="space-y-4">
      <SheetHeader>
        <SheetTitle className="pr-6">{l.title}</SheetTitle>
        <SheetDescription>
          <Link
            to="/listing/$id"
            params={{ id: l.id }}
            target="_blank"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            View public listing <ExternalLink className="h-3 w-3" />
          </Link>
        </SheetDescription>
      </SheetHeader>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.slice(0, 6).map((m: any) => (
            <img key={m.id} src={m.url} alt="" className="aspect-square w-full rounded object-cover" />
          ))}
        </div>
      )}

      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Price</span>
          <span className="font-medium">
            {l.price_hidden ? "Hidden" : formatPHP(l.price_php)}
            {l.negotiable ? " (negotiable)" : ""}
          </span>
        </div>
        {l.monthly_php != null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monthly</span>
            <span className="font-medium">{formatPHP(l.monthly_php)}/mo</span>
          </div>
        )}
        {l.down_payment_php != null && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Down payment</span>
            <span className="font-medium">{formatPHP(l.down_payment_php)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge className={STATUS_BADGE_CLASS[l.status] ?? ""}>{STATUS_LABELS[l.status] ?? l.status}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Category</span>
          <span className="capitalize">{l.category_slug}</span>
        </div>
        {l.condition && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Condition</span>
            <span className="capitalize">{l.condition}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Registration</span>
          <span className="capitalize">{(l.registration_status ?? "unknown").replace(/_/g, " ")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Location</span>
          <span className="text-right">
            {[l.barangay, l.city, l.province, l.region].filter(Boolean).join(", ") || "—"}
          </span>
        </div>
        {l.expires_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Expires</span>
            <span>{formatDate(l.expires_at)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Boost</span>
          {boosted ? (
            <span className="inline-flex items-center gap-1 font-medium">
              <Megaphone className="h-3 w-3" /> until {formatDate(l.boost_until)}
            </span>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Views</span>
          <span>{l.view_count ?? 0}</span>
        </div>
      </div>

      {l.description && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </div>
          <p className="whitespace-pre-wrap text-sm">{l.description}</p>
        </div>
      )}

      {(l.listing_fitment ?? []).length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fitment</div>
          <ul className="space-y-1 text-sm">
            {l.listing_fitment.map((f: any) => (
              <li key={f.id}>
                {f.make} {f.model}
                {f.trim ? ` ${f.trim}` : ""} ({f.year_min ?? "?"}–{f.year_max ?? "?"})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seller</div>
        <div className="rounded-md border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{sellerName(seller)}</span>
            <Badge variant="outline" className="capitalize">
              {l.seller_type}
            </Badge>
            {seller?.verification_status === "verified" ? (
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
              >
                <ShieldCheck className="mr-0.5 h-2.5 w-2.5" /> verified
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] capitalize text-muted-foreground">
                {seller?.verification_status ?? "unverified"}
              </Badge>
            )}
            {seller?.account_status && seller.account_status !== "active" && (
              <Badge variant="destructive" className="text-[10px] capitalize">
                {seller.account_status}
              </Badge>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Phone: {l.contact_phone ?? seller?.phone ?? "—"}
            {seller?.phone_verified_at ? " (verified)" : ""}
          </div>
          {seller?.seller_rating_count > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              <Star className="inline h-3 w-3 fill-yellow-500 text-yellow-500" />{" "}
              {Number(seller.seller_rating_avg).toFixed(1)} ({seller.seller_rating_count} reviews)
            </div>
          )}
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">{l.user_id}</div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reports ({reports.length})
        </div>
        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports on this listing.</p>
        ) : (
          <ul className="space-y-2">
            {reports.map((r: any) => (
              <li key={r.id} className="rounded-md border border-border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <Badge variant={r.status === "resolved" ? "secondary" : "destructive"}>{r.status}</Badge>
                  <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
                </div>
                <div className="mt-1 font-medium">
                  {r.reason}
                  {r.category ? ` · ${r.category}` : ""}
                </div>
                {r.details && <p className="mt-1 text-muted-foreground">{r.details}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
