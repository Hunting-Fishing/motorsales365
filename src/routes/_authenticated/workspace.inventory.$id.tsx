import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useId, useState } from "react";
import { ArrowLeft, Boxes, Loader2, Pencil } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { getShopStockItem } from "@/lib/shop-stock-operation.functions";
import {
  ShopStockAdjustment,
  type ShopStockSnapshot,
} from "@/components/shop-manager/stock-adjustment";

export const Route = createFileRoute("/_authenticated/workspace/inventory/$id")({
  head: () => ({
    meta: [
      { title: "Inventory item — Shop Manager" },
      { name: "description", content: "Part details, stock levels, and transaction history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InventoryItemPage,
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <h1 className="text-2xl font-bold">Inventory item</h1>
          <p className="mt-2 text-destructive">Could not load this inventory item.</p>
          <Button
            className="mt-4"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Retry
          </Button>
        </div>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Item not found.</div>
    </SiteLayout>
  ),
});

function InventoryItemPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <ScopedInventoryItem key={`${user.id}:${id}`} accountId={user.id} id={id} />;
}
function ScopedInventoryItem({ accountId, id }: { accountId: string; id: string }) {
  const read = useServerFn(getShopStockItem);
  const client = useQueryClient();
  const lifetime = useId();
  const [selected, setSelected] = useState<ShopStockSnapshot | null>(null);
  const query = useQuery({
    queryKey: ["shop-manager", accountId, "inventory", "detail", id, lifetime],
    queryFn: () => read({ data: { expectedAccountId: accountId, itemId: id } }),
    staleTime: 0,
    gcTime: 0,
    placeholderData: undefined,
    retry: false,
  });
  const fresh =
    query.isSuccess &&
    !query.isFetching &&
    query.fetchStatus === "idle" &&
    query.data.accountId === accountId &&
    query.data.item.id === id;
  const data = fresh ? (query.data?.item ?? null) : null;
  const txns = fresh ? (query.data?.transactions ?? []) : [];
  const isLoading = query.isPending || query.isFetching;
  const shopId =
    query.isSuccess && query.data.accountId === accountId && query.data.item.id === id
      ? query.data.shopId
      : null;
  const changed = () => {
    client.invalidateQueries({ queryKey: ["shop-manager"] });
  };

  const qty = data?.quantity ?? data?.quantity_in_stock ?? 0;
  const rp = data?.reorder_point ?? 0;
  const low = qty <= rp;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/workspace/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to inventory
          </Link>
        </Button>

        {query.isError ? (
          <div role="alert">
            Shop inventory is unavailable. Check access and the database update.{" "}
            <Button onClick={() => void query.refetch()}>Retry inventory</Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !data ? (
          <Card>
            <CardHeader>
              <CardTitle>Item not found</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This item may have been deleted or your shop no longer has access.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Boxes className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">{data.name ?? "Item"}</h1>
                  <p className="text-muted-foreground font-mono text-sm">
                    {data.sku ?? data.part_number ?? data.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {low ? (
                  <Badge variant="destructive">Low stock</Badge>
                ) : (
                  <Badge variant="outline">{data.status ?? "OK"}</Badge>
                )}
                {data.category ? <Badge variant="outline">{data.category}</Badge> : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!fresh || !query.data?.canAdjust}
                  onClick={() => {
                    if (data && fresh && query.data?.canAdjust) setSelected(data);
                  }}
                >
                  <Pencil className="mr-1 h-4 w-4" /> Adjust stock
                </Button>
              </div>
            </div>

            {!query.data?.canAdjust ? (
              <p role="status" className="mb-4 text-sm text-muted-foreground">
                Adjustments require management access and this shop selected in your employee
                profile. Any active shift must belong to the same shop. Existing requests can still
                be reviewed.
              </p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stock</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Field label="On hand" value={String(qty)} />
                  <Field label="Reorder point" value={String(rp)} />
                  <Field
                    label="On hold"
                    value={data.on_hold != null ? String(data.on_hold) : null}
                  />
                  <Field
                    label="On order"
                    value={data.on_order != null ? String(data.on_order) : null}
                  />
                  <Field label="Location" value={data.location} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Field
                    label="Unit price"
                    value={
                      data.unit_price != null
                        ? `₱${Number(data.unit_price).toLocaleString()}`
                        : null
                    }
                  />
                  <Field
                    label="Cost / unit"
                    value={
                      data.cost_per_unit != null
                        ? `₱${Number(data.cost_per_unit).toLocaleString()}`
                        : null
                    }
                  />
                  <Field
                    label="Sell / unit"
                    value={
                      data.sell_price_per_unit != null
                        ? `₱${Number(data.sell_price_per_unit).toLocaleString()}`
                        : null
                    }
                  />
                  <Field
                    label="Margin / markup"
                    value={data.margin_markup != null ? `${data.margin_markup}%` : null}
                  />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                  <Field label="Part number" value={data.part_number} />
                  <Field label="Barcode" value={data.barcode} />
                  <Field label="Supplier" value={data.supplier} />
                  <Field label="Manufacturer" value={data.manufacturer} />
                  <Field label="Subcategory" value={data.subcategory} />
                  <Field label="Warranty" value={data.warranty_period} />
                  <Field label="Vehicle compatibility" value={data.vehicle_compatibility} />
                  <Field label="Description" value={data.description} />
                  <Field label="Notes" value={data.notes} />
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Recent transactions ({txns.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {txns.length === 0 ? (
                    <div className="px-6 pb-6 text-sm text-muted-foreground">
                      No transactions recorded.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {txns.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              {t.transaction_date
                                ? new Date(t.transaction_date).toLocaleString()
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{t.transaction_type ?? "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{t.quantity ?? 0}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {t.reference_type
                                ? `${t.reference_type}: ${(t.reference_id ?? "").slice(0, 8)}`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs">{t.notes ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
        {shopId ? (
          <ShopStockAdjustment
            accountId={accountId}
            shopId={shopId}
            selected={selected}
            canAdjust={Boolean(fresh && query.data?.canAdjust)}
            onClose={() => setSelected(null)}
            onChanged={changed}
          />
        ) : null}
      </div>
    </SiteLayout>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">
        {value && value.length > 0 ? value : <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
