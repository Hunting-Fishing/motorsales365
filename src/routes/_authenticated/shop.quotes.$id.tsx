import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText, ArrowRightCircle } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

type Q = {
  id: string;
  quote_number: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  status: string | null;
  subtotal: number | null;
  tax_rate: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  expiry_date: string | null;
  notes: string | null;
  terms_conditions: string | null;
  created_at: string | null;
  converted_to_work_order_id: string | null;
};

type Item = {
  id: string;
  name: string | null;
  description: string | null;
  category: string | null;
  quantity: number | null;
  unit_price: number | null;
  total_price: number | null;
  item_type: string | null;
};

async function fetchQuote(id: string) {
  const { data, error } = await (smSupabase as any)
    .from("quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Q | null;
}
async function fetchItems(id: string) {
  const { data, error } = await (smSupabase as any)
    .from("quote_items")
    .select("id,name,description,category,quantity,unit_price,total_price,item_type")
    .eq("quote_id", id)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Item[];
}

export const Route = createFileRoute("/_authenticated/shop/quotes/$id")({
  head: () => ({
    meta: [
      { title: "Quote — Shop Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuoteDetail,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Quote</h1>
        <p className="mt-2 text-destructive">{String((error as any)?.message ?? error)}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout><div className="mx-auto max-w-4xl px-4 py-10">Quote not found.</div></SiteLayout>
  ),
});

function QuoteDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: quote, isLoading } = useQuery({
    queryKey: ["shop-manager", "quote", id],
    queryFn: () => fetchQuote(id),
  });
  const { data: items = [] } = useQuery({
    queryKey: ["shop-manager", "quote", id, "items"],
    queryFn: () => fetchItems(id),
  });

  const convert = useMutation({
    mutationFn: async () => {
      if (!quote) throw new Error("Quote not loaded");
      if (quote.converted_to_work_order_id) return quote.converted_to_work_order_id;

      const { data: woIns, error: woErr } = await (smSupabase as any)
        .from("work_orders")
        .insert({
          customer_id: quote.customer_id,
          vehicle_id: quote.vehicle_id,
          status: "pending",
          description: quote.notes ?? `Converted from quote ${quote.quote_number ?? id.slice(0, 8)}`,
          total_cost: quote.total_amount ?? 0,
        })
        .select("id")
        .single();
      if (woErr) throw woErr;
      const woId = woIns.id as string;

      // Copy quote items into job lines & parts
      const jobLines = items
        .filter((i) => (i.item_type ?? "").toLowerCase() === "labor" || (i.category ?? "").toLowerCase() === "labor")
        .map((i) => ({
          work_order_id: woId,
          name: i.name ?? "Labor",
          description: i.description,
          category: i.category,
          hours: Number(i.quantity ?? 0),
          labor_rate: Number(i.unit_price ?? 0),
          total: Number(i.total_price ?? 0),
        }));
      const parts = items
        .filter((i) => !((i.item_type ?? "").toLowerCase() === "labor" || (i.category ?? "").toLowerCase() === "labor"))
        .map((i) => ({
          work_order_id: woId,
          name: i.name ?? "Part",
          quantity: Number(i.quantity ?? 1),
          price: Number(i.unit_price ?? 0),
          total: Number(i.total_price ?? 0),
          status: "pending",
        }));

      if (jobLines.length) {
        const { error } = await (smSupabase as any).from("work_order_job_lines").insert(jobLines);
        if (error) throw error;
      }
      if (parts.length) {
        const { error } = await (smSupabase as any).from("work_order_parts").insert(parts);
        if (error) throw error;
      }

      const { error: uErr } = await (smSupabase as any)
        .from("quotes")
        .update({
          status: "converted",
          converted_at: new Date().toISOString(),
          converted_to_work_order_id: woId,
        })
        .eq("id", id);
      if (uErr) throw uErr;

      return woId;
    },
    onSuccess: (woId) => {
      toast.success("Quote converted to work order");
      qc.invalidateQueries({ queryKey: ["shop-manager", "quote", id] });
      qc.invalidateQueries({ queryKey: ["shop-manager", "quotes", "list"] });
      navigate({ to: "/shop/work-orders/$id", params: { id: woId } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to convert"),
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </SiteLayout>
    );
  }
  if (!quote) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">Quote not found.</div>
      </SiteLayout>
    );
  }

  const converted = !!quote.converted_to_work_order_id;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Quote {quote.quote_number ?? id.slice(0, 8)}</h1>
              <p className="text-muted-foreground">
                {quote.created_at ? `Created ${new Date(quote.created_at).toLocaleDateString()}` : ""}
                {quote.expiry_date ? ` · expires ${new Date(quote.expiry_date).toLocaleDateString()}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={converted ? "default" : "outline"}>{quote.status ?? "draft"}</Badge>
            {converted ? (
              <Button asChild variant="outline">
                <Link
                  to="/shop/work-orders/$id"
                  params={{ id: quote.converted_to_work_order_id! }}
                >
                  Open Work Order →
                </Link>
              </Button>
            ) : (
              <Button onClick={() => convert.mutate()} disabled={convert.isPending}>
                <ArrowRightCircle className="mr-2 h-4 w-4" />
                {convert.isPending ? "Converting…" : "Convert to Work Order"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Subtotal</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">₱{Number(quote.subtotal ?? 0).toLocaleString()}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tax</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">₱{Number(quote.tax_amount ?? 0).toLocaleString()}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">₱{Number(quote.total_amount ?? 0).toLocaleString()}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted-foreground">No items.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit ₱</TableHead>
                    <TableHead className="text-right">Total ₱</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <div className="font-medium">{i.name ?? "—"}</div>
                        {i.description ? <div className="text-xs text-muted-foreground">{i.description}</div> : null}
                      </TableCell>
                      <TableCell><Badge variant="outline">{i.item_type ?? i.category ?? "—"}</Badge></TableCell>
                      <TableCell className="text-right">{Number(i.quantity ?? 0)}</TableCell>
                      <TableCell className="text-right">{Number(i.unit_price ?? 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(i.total_price ?? 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {quote.notes || quote.terms_conditions ? (
          <div className="grid gap-4 sm:grid-cols-2 mt-6">
            {quote.notes ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap">{quote.notes}</CardContent>
              </Card>
            ) : null}
            {quote.terms_conditions ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Terms</CardTitle></CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap">{quote.terms_conditions}</CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6">
          <Button asChild variant="ghost">
            <Link to="/shop/quotes">← Back to Quotes</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
