import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, ArrowRightLeft, Store, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  searchClaimableBusinesses,
  listMyClaimRequests,
} from "@/lib/business-claims.functions";
import { ClaimCta } from "@/components/business-page/claim-cta";
import { TransferRequestDialog } from "@/components/business-page/transfer-request-dialog";

export const Route = createFileRoute("/_authenticated/dashboard/claim-business")({
  component: ClaimBusinessPage,
  head: () => ({
    meta: [
      { title: "Claim a Business — 365 Motor Sales" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Hit = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  region: string | null;
  claim_state: string | null;
  owner_id: string | null;
};

function ClaimBusinessPage() {
  const search = useServerFn(searchClaimableBusinesses);
  const listMine = useServerFn(listMyClaimRequests);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [transferFor, setTransferFor] = useState<Hit | null>(null);

  const { data: mine } = useQuery({
    queryKey: ["my-claim-requests"],
    queryFn: () => listMine(),
  });

  const runSearch = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      const res = await search({ data: { q: q.trim() } });
      setResults(res.results as Hit[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-bold">Claim a business</h1>
        <p className="text-sm text-muted-foreground">
          Search the directory for your business. If it's unclaimed you can claim it instantly;
          if someone else already manages it you can request an ownership transfer with proof of
          ownership. All requests are reviewed by our admin team.
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by business name, slug or city…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              className="pl-9"
            />
          </div>
          <Button onClick={runSearch} disabled={busy || q.trim().length < 2}>
            {busy ? "Searching…" : "Search"}
          </Button>
        </div>

        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {busy ? "Searching…" : "Enter at least 2 characters and press Search."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {results.map((b) => (
              <BusinessRow
                key={b.id}
                biz={b}
                onTransfer={() => setTransferFor(b)}
              />
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">My claim & transfer requests</h2>
        {!mine?.requests?.length ? (
          <p className="text-xs text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {mine.requests.map((r: any) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/60 p-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    to="/businesses/$slug"
                    params={{ slug: r.businesses?.slug ?? "" }}
                    className="font-medium underline"
                  >
                    {r.businesses?.name ?? "Unknown business"}
                  </Link>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {r.kind === "transfer" ? "Transfer" : "Claim"}
                    </Badge>
                    <Clock className="h-3 w-3" />
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                  {r.reviewer_notes && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Reviewer: {r.reviewer_notes}
                    </div>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {transferFor && (
        <TransferRequestDialog
          open={!!transferFor}
          onOpenChange={(o) => !o && setTransferFor(null)}
          businessId={transferFor.id}
          businessName={transferFor.name}
        />
      )}
    </div>
  );
}

function BusinessRow({ biz, onTransfer }: { biz: Hit; onTransfer: () => void }) {
  const isClaimed = !!biz.owner_id || biz.claim_state === "owned";
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {biz.logo_url ? (
          <img
            src={biz.logo_url}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
            <Store className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <Link
            to="/businesses/$slug"
            params={{ slug: biz.slug }}
            className="block truncate text-sm font-medium hover:underline"
          >
            {biz.name}
          </Link>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {[biz.city, biz.region].filter(Boolean).join(", ") || "Location unknown"}
            {isClaimed ? (
              <Badge variant="secondary" className="ml-2">
                <ShieldCheck className="mr-1 h-3 w-3" /> Claimed
              </Badge>
            ) : biz.claim_state === "claim_pending" ? (
              <Badge variant="outline" className="ml-2">
                Claim pending
              </Badge>
            ) : (
              <Badge variant="outline" className="ml-2">
                Unclaimed
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0">
        {isClaimed ? (
          <Button size="sm" variant="outline" onClick={onTransfer}>
            <ArrowRightLeft className="mr-1 h-4 w-4" />
            Request transfer
          </Button>
        ) : (
          <ClaimCta
            businessId={biz.id}
            businessName={biz.name}
            claimState={biz.claim_state ?? "unclaimed"}
          />
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "Pending review", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    auto_approved: { label: "Auto-approved", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-800 border-red-200" },
  };
  const v = map[status] ?? { label: status, cls: "" };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}
