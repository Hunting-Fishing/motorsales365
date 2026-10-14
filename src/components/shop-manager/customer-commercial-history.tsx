import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { smSupabase } from "@/lib/shop-manager/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Invoice = {
  id: string;
  date: string | null;
  due_date: string | null;
  status: string | null;
  total: number | null;
};
type Quote = {
  id: string;
  quote_number: string | null;
  created_at: string | null;
  expiry_date: string | null;
  status: string | null;
  total_amount: number | null;
};

// Current Shop Manager invoices/quotes are denominated in PHP. Do not convert
// operational amounts using a visitor's display-currency preference.
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
function amount(value: number | null) {
  return value == null ? "Amount not set" : money.format(value);
}
function date(value: string | null) {
  if (!value) return "Date not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Date not set" : parsed.toLocaleDateString("en-PH");
}

export function CustomerCommercialHistory({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  const invoices = useQuery({
    queryKey: ["shop-manager", user?.id, "customer", customerId, "invoices"],
    enabled: !!user,
    queryFn: async (): Promise<Invoice[]> => {
      // Generated types currently describe public, not the shop_manager schema.
      const { data, error } = await (smSupabase as any)
        .from("invoices")
        .select("id,date,due_date,status,total")
        .eq("customer_id", customerId)
        .order("date", { ascending: false })
        .limit(26);
      if (error) throw error;
      return (data ?? []) as Invoice[];
    },
  });
  const quotes = useQuery({
    queryKey: ["shop-manager", user?.id, "customer", customerId, "quotes"],
    enabled: !!user,
    queryFn: async (): Promise<Quote[]> => {
      const { data, error } = await (smSupabase as any)
        .from("quotes")
        .select("id,quote_number,created_at,expiry_date,status,total_amount")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(26);
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });

  if (!user) return null;

  return (
    <section className="grid gap-4 md:grid-cols-2" aria-label="Customer quotes and invoices">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.isError ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>Could not load this customer's quotes.</p>
              <Button variant="outline" size="sm" onClick={() => void quotes.refetch()}>
                Retry quotes
              </Button>
            </div>
          ) : quotes.isPending ? (
            <p role="status">Loading quotes…</p>
          ) : !quotes.data.length ? (
            <p className="text-sm text-muted-foreground">No quotes for this customer yet.</p>
          ) : (
            <ul className="space-y-3">
              {quotes.data.slice(0, 25).map((quote) => (
                <li key={quote.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to="/workspace/quotes/$id"
                      params={{ id: quote.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}
                    </Link>
                    <Badge variant="outline">{quote.status || "draft"}</Badge>
                  </div>
                  <p className="mt-1 font-medium">{amount(quote.total_amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {date(quote.created_at)}
                    {quote.expiry_date ? ` · Expires ${date(quote.expiry_date)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {quotes.data && quotes.data.length > 25 ? (
            <p className="mt-3 text-xs text-muted-foreground">Showing the 25 most recent quotes.</p>
          ) : null}
          <Button asChild variant="ghost" size="sm" className="mt-3">
            <Link to="/workspace/quotes">Open quote workspace</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.isError ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>Could not load this customer's invoices.</p>
              <Button variant="outline" size="sm" onClick={() => void invoices.refetch()}>
                Retry invoices
              </Button>
            </div>
          ) : invoices.isPending ? (
            <p role="status">Loading invoices…</p>
          ) : !invoices.data.length ? (
            <p className="text-sm text-muted-foreground">No invoices for this customer yet.</p>
          ) : (
            <ul className="space-y-3">
              {invoices.data.slice(0, 25).map((invoice) => (
                <li key={invoice.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to="/workspace/invoices/$id"
                      params={{ id: invoice.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      Invoice {invoice.id}
                    </Link>
                    <Badge variant="outline">{invoice.status || "draft"}</Badge>
                  </div>
                  <p className="mt-1 font-medium">{amount(invoice.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    Issued {date(invoice.date)}
                    {invoice.due_date ? ` · Due ${date(invoice.due_date)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {invoices.data && invoices.data.length > 25 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the 25 most recent invoices.
            </p>
          ) : null}
          <Button asChild variant="ghost" size="sm" className="mt-3">
            <Link to="/workspace/invoices">Open invoice workspace</Link>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
