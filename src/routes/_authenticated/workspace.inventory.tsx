import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Boxes, Loader2, Search } from "lucide-react";
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

type InvItem = {
  id: string;
  name: string | null;
  sku: string | null;
  part_number: string | null;
  category: string | null;
  supplier: string | null;
  quantity: number | null;
  reorder_point: number | null;
  unit_price: number | null;
  location: string | null;
  status: string | null;
};

async function fetchInventory(): Promise<InvItem[]> {
  const { data, error } = await (smSupabase as any)
    .from("inventory_items")
    .select("id,name,sku,part_number,category,supplier,quantity,reorder_point,unit_price,location,status")
    .order("name", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as InvItem[];
}

export const Route = createFileRoute("/_authenticated/workspace/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Shop Manager" },
      { name: "description", content: "Parts, SKUs, and stock levels across your shop." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryList,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Not found.</div></SiteLayout>
  ),
});

function InventoryList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "inventory", "list"],
    queryFn: fetchInventory,
  });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((i: InvItem) =>
      [i.name, i.sku, i.part_number, i.category, i.supplier, i.location].some((v) =>
        String(v ?? "").toLowerCase().includes(s),
      ),
    );
  }, [data, q]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Boxes className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Inventory</h1>
              <p className="text-muted-foreground">Parts, SKUs, and stock levels.</p>
            </div>
          </div>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, SKU, part #, category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            {data.length === 0 ? "No inventory items yet." : "No items match your search."}
          </CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU / Part #</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Reorder</TableHead>
                    <TableHead className="text-right">Unit ₱</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => {
                    const qty = i.quantity ?? 0;
                    const rp = i.reorder_point ?? 0;
                    const low = qty <= rp;
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">
                          <Link to="/workspace/inventory/$id" params={{ id: i.id }} className="text-primary hover:underline">
                            {i.name ?? "—"}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{i.sku ?? i.part_number ?? "—"}</TableCell>
                        <TableCell>{i.category ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <span className={low ? "text-destructive font-semibold" : ""}>{qty}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{rp}</TableCell>
                        <TableCell className="text-right">
                          {typeof i.unit_price === "number" ? i.unit_price.toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          {low ? (
                            <Badge variant="destructive">Low</Badge>
                          ) : (
                            <Badge variant="outline">{i.status ?? "OK"}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          Item detail, adjustments, and purchase orders are next on the porting list — for full functionality, use the legacy screens under <code className="rounded bg-muted px-1">src/shop-manager/pages</code>.
        </div>
        <div className="mt-4">
          <Button asChild variant="ghost"><Link to="/workspace">← Back to Shop Manager</Link></Button>
        </div>
      </div>
    </SiteLayout>
  );
}
