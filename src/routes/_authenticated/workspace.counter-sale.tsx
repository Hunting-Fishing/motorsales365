import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Minus, Plus, Receipt, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { smSupabase } from "@/lib/shop-manager/db";

export const Route = createFileRoute("/_authenticated/workspace/counter-sale")({
  component: CounterSale,
});

function CounterSale() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, { item: any; qty: number }>>({});
  const [tender, setTender] = useState("");
  const data = useQuery({
    queryKey: ["counter-sale"],
    queryFn: async () => {
      const [ctx, regs, items, sessions] = await Promise.all([
        (smSupabase as any).rpc("employee_operating_context"),
        (smSupabase as any).from("cash_registers").select("*").eq("active", true),
        (smSupabase as any)
          .from("inventory_items")
          .select("id,name,sku,part_number,quantity,unit_price,cost")
          .gt("quantity", 0)
          .limit(500),
        (smSupabase as any).from("register_sessions").select("*").eq("status", "open").limit(1),
      ]);
      if (ctx.error) throw ctx.error;
      return {
        ctx: ctx.data,
        registers: regs.data ?? [],
        items: items.data ?? [],
        session: sessions.data?.[0] ?? null,
      };
    },
  });
  const open = useMutation({
    mutationFn: async () => {
      const id = data.data?.registers[0]?.id;
      if (!id) throw new Error("No register configured");
      const { error } = await (smSupabase as any).rpc("open_register", {
        _register_id: id,
        _opening_float: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Register opened");
      qc.invalidateQueries({ queryKey: ["counter-sale"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const close = useMutation({
    mutationFn: async () => {
      if (Object.keys(cart).length) throw new Error("Complete or clear the current sale first");
      const counted = window.prompt("Count the cash drawer and enter the closing amount:");
      if (counted === null) return null;
      const amount = Number(counted);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a valid cash amount");
      const { data: result, error } = await (smSupabase as any).rpc("close_register", {
        _session_id: data.data?.session?.id,
        _counted_cash: amount,
        _note: null,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (result: any) => {
      if (!result) return;
      const variance = Number(result.variance ?? 0);
      toast.success(`Register closed · variance ${variance < 0 ? "-" : "+"}₱${Math.abs(variance).toLocaleString()}`);
      qc.invalidateQueries({ queryKey: ["counter-sale"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const lines = Object.values(cart);
  const total = lines.reduce((s, x) => s + x.qty * Number(x.item.unit_price ?? 0), 0);
  const checkout = useMutation({
    mutationFn: async () => {
      const { data: r, error } = await (smSupabase as any).rpc("complete_counter_sale", {
        _register_session_id: data.data?.session?.id,
        _customer_id: null,
        _tender_type: "cash",
        _amount_tendered: Number(tender),
        _lines: lines.map((x) => ({
          inventory_item_id: x.item.id,
          quantity: x.qty,
          unit_price: x.item.unit_price,
        })),
        _discount: 0,
        _tax: 0,
        _approval_id: null,
      });
      if (error) throw error;
      return r;
    },
    onSuccess: (r: any) => {
      toast.success(
        `${r.sale_number} completed · change ₱${Number(r.change_due).toLocaleString()}`,
      );
      setCart({});
      setTender("");
      qc.invalidateQueries({ queryKey: ["counter-sale"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const items = useMemo(
    () =>
      data.data?.items.filter((i: any) =>
        `${i.name} ${i.sku} ${i.part_number}`.toLowerCase().includes(search.toLowerCase()),
      ) ?? [],
    [data.data, search],
  );
  return (
    <SiteLayout>
      <main className="mx-auto max-w-7xl p-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <ShoppingCart className="text-primary" />
              Counter Sale
            </h1>
            <p className="text-muted-foreground">
              Fast parts-counter checkout with atomic stock deduction.
            </p>
          </div>
          <div className="flex gap-2">
            {data.data?.session && (
              <Button variant="outline" onClick={() => close.mutate()} disabled={close.isPending}>
                <LogOut className="mr-2 h-4 w-4" /> Close register
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/workspace/operations">Employee Operations</Link>
            </Button>
          </div>
        </header>
        {!data.data?.session ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Receipt className="mx-auto mb-3 h-10 w-10 text-primary" />
              <h2 className="text-xl font-semibold">Open your register</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Clock in first, then open the counter.
              </p>
              <Button onClick={() => open.mutate()}>Open Front Counter</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <section>
              <Input
                className="mb-3"
                placeholder="Scan or search SKU, part number, name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                {items.slice(0, 40).map((i: any) => (
                  <button
                    key={i.id}
                    className="rounded-xl border p-3 text-left hover:border-primary"
                    onClick={() =>
                      setCart((c) => ({ ...c, [i.id]: { item: i, qty: (c[i.id]?.qty ?? 0) + 1 } }))
                    }
                  >
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.sku ?? i.part_number} · {i.quantity} available
                    </p>
                    <p className="mt-2 font-mono text-lg">
                      ₱{Number(i.unit_price ?? 0).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            </section>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Current sale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lines.map((x) => (
                  <div key={x.item.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="text-sm font-medium">{x.item.name}</p>
                      <p className="text-xs">₱{Number(x.item.unit_price).toLocaleString()} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          setCart((c) => ({
                            ...c,
                            [x.item.id]: { ...x, qty: Math.max(1, x.qty - 1) },
                          }))
                        }
                      >
                        <Minus />
                      </Button>
                      <span>{x.qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          setCart((c) => ({ ...c, [x.item.id]: { ...x, qty: x.qty + 1 } }))
                        }
                      >
                        <Plus />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span>₱{total.toLocaleString()}</span>
                </div>
                <Input
                  type="number"
                  placeholder="Cash tendered"
                  value={tender}
                  onChange={(e) => setTender(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={!lines.length || Number(tender) < total || checkout.isPending}
                  onClick={() => checkout.mutate()}
                >
                  Complete cash sale
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </SiteLayout>
  );
}
