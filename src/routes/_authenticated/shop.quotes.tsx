import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileText, Loader2, Search } from "lucide-react";
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

type Q = {
  id: string;
  quote_number: string | null;
  customer_id: string | null;
  status: string | null;
  total_amount: number | null;
  expiry_date: string | null;
  created_at: string | null;
  converted_to_work_order_id: string | null;
};

async function fetchQuotes(): Promise<Q[]> {
  const { data, error } = await (smSupabase as any)
    .from("quotes")
    .select("id,quote_number,customer_id,status,total_amount,expiry_date,created_at,converted_to_work_order_id")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as Q[];
}

export const Route = createFileRoute("/_authenticated/shop/quotes")({
  head: () => ({
    meta: [
      { title: "Quotes — Shop Manager" },
      { name: "description", content: "Estimates and quotes for your customers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuotesList,
  errorComponent: ({ error, reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Quotes</h1>
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
  if (v === "approved" || v === "converted") return "default";
  if (v === "rejected" || v === "expired") return "destructive";
  if (v === "sent") return "secondary";
  return "outline";
}

function QuotesList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["shop-manager", "quotes", "list"],
    queryFn: fetchQuotes,
  });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((x) =>
      [x.quote_number, x.status].some((v) => String(v ?? "").toLowerCase().includes(s)),
    );
  }, [data, q]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Quotes</h1>
            <p className="text-muted-foreground">Estimates and proposals.</p>
          </div>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by quote # or status…"
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
              {data.length === 0 ? "No quotes yet." : "No quotes match your search."}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Total ₱</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Work order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/shop/quotes/$id"
                          params={{ id: x.id }}
                          className="text-primary hover:underline"
                        >
                          {x.quote_number ?? x.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {x.created_at ? new Date(x.created_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        {x.expiry_date ? new Date(x.expiry_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof x.total_amount === "number" ? x.total_amount.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(x.status)}>{x.status ?? "draft"}</Badge>
                      </TableCell>
                      <TableCell>
                        {x.converted_to_work_order_id ? (
                          <Link
                            to="/shop/work-orders/$id"
                            params={{ id: x.converted_to_work_order_id }}
                            className="text-primary hover:underline text-sm"
                          >
                            View WO →
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
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
            <Link to="/shop">← Back to Shop Manager</Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  );
}
