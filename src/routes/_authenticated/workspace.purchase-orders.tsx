import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PackageSearch, Loader2, Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { smSupabase } from "@/lib/shop-manager/db";

type PO = {
  id: string;
  po_number: string | null;
  supplier_id: string | null;
  status: string | null;
  order_date: string | null;
  expected_delivery_date: string | null;
  total_amount: number | null;
};

async function fetchPOs(): Promise<PO[]> {
  const { data, error } = await (smSupabase as any)
    .from("purchase_orders")
    .select("id,po_number,supplier_id,status,order_date,expected_delivery_date,total_amount")
    .order("order_date", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as PO[];
}

export const Route = createFileRoute("/_authenticated/workspace/purchase-orders")({
  head: () => ({
    meta: [
      { title: "Purchase Orders — Shop Manager" },
      { name: "description", content: "Track POs and receiving." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: POList,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function statusVariant(s: string | null): "default" | "outline" | "destructive" | "secondary" {
  const v = (s ?? "").toLowerCase();
  if (v === "received") return "default";
  if (v === "cancelled") return "destructive";
  if (v === "partial" || v === "partially_received") return "secondary";
  return "outline";
}

function POList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "purchase-orders", "list"],
    queryFn: fetchPOs,
  });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((p) =>
      [p.po_number, p.status].some((v) => String(v ?? "").toLowerCase().includes(s)),
    );
  }, [data, q]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PackageSearch className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Purchase Orders</h1>
              <p className="text-muted-foreground">Track supplier POs and receiving.</p>
            </div>
          </div>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by PO # or status…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {data.length === 0 ? "No purchase orders yet." : "No POs match your search."}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Order date</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead className="text-right">Total ₱</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/workspace/purchase-orders/$id"
                          params={{ id: p.id }}
                          className="text-primary hover:underline"
                        >
                          {p.po_number ?? p.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {p.order_date ? new Date(p.order_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        {p.expected_delivery_date
                          ? new Date(p.expected_delivery_date).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof p.total_amount === "number" ? p.total_amount.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(p.status)}>{p.status ?? "draft"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="mt-6">
          <Button asChild variant="ghost">
            <Link to="/workspace">← Back to Shop Manager</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
