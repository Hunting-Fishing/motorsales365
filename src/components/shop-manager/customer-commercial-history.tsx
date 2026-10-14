import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getCustomerCommercialSnapshot } from "@/lib/customer-commercial.functions";
import type { CustomerCommercialKind, CustomerCommercialResult } from "@/lib/customer-commercial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Current Shop Manager invoices/quotes are denominated in PHP. Do not convert
// operational amounts using a visitor's display-currency preference.
const money = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 20,
});
function amount(value: number | null) {
  if (value === null) return "Amount not set";
  // Native invoice NUMERIC is unscaled. Preserve the received JS number instead
  // of silently rounding it to minor units. SQL precision already lost during
  // number transport cannot be restored here; this is not reconciliation.
  const formatted = money.format(value);
  const preservesReceivedNumber = Number(formatted.replaceAll(",", "")) === value;
  return `₱${preservesReceivedNumber ? formatted : value.toString()}`;
}
function calendarDate(value: string | null) {
  if (value === null) return "Date not set";
  // Invoice date/due_date are legacy TEXT, not SQL dates. Do not infer locale
  // formats or normalize an impossible calendar day into a different date.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Date format not recognized";
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return "Date format not recognized";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    return "Date format not recognized";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
}
function timestamp(value: string | null) {
  if (value === null) return "Date not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Date format not recognized"
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(parsed);
}

function CommercialRows({ result }: { result: CustomerCommercialResult }) {
  if (result.kind === "quotes") {
    return (
      <ul className="space-y-3" aria-label="Customer quote records">
        {result.rows.slice(0, 25).map((quote) => (
          <li key={quote.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                to="/workspace/quotes/$id"
                params={{ id: quote.id }}
                className="font-medium text-primary hover:underline"
              >
                {quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}
              </Link>
              <Badge variant="outline">{quote.status || "Status not set"}</Badge>
            </div>
            <p className="mt-1 font-medium">{amount(quote.total_amount)}</p>
            <p className="text-xs text-muted-foreground">
              Created {timestamp(quote.created_at)}
              {` · Expires ${calendarDate(quote.expiry_date)}`}
            </p>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="space-y-3" aria-label="Customer invoice records">
      {result.rows.slice(0, 25).map((invoice) => (
        <li key={invoice.id} className="rounded-lg border p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to="/workspace/invoices/$id"
              params={{ id: invoice.id }}
              className="font-medium text-primary hover:underline"
            >
              Invoice {invoice.id}
            </Link>
            <Badge variant="outline">{invoice.status || "Status not set"}</Badge>
          </div>
          <p className="mt-1 font-medium">{amount(invoice.total)}</p>
          <p className="text-xs text-muted-foreground">
            Issued {calendarDate(invoice.date)} · Due {calendarDate(invoice.due_date)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function CommercialSource({
  accountId,
  customerId,
  kind,
}: {
  accountId: string;
  customerId: string;
  kind: CustomerCommercialKind;
}) {
  const read = useServerFn(getCustomerCommercialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: ["shop-manager", accountId, "customer", customerId, kind],
    queryFn: ({ signal }) =>
      read({ data: { expectedAccountId: accountId, customerId, kind }, signal }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    placeholderData: undefined,
    retry: false,
  });
  // A matching cache entry is not current authorization. Mask rows and cap
  // captions during every revalidation, including errors and access loss.
  const checking = refreshing || query.isFetching || query.isPending || !query.isFetchedAfterMount;
  const failed = query.isError || (query.data !== undefined && query.data.kind !== kind);
  const result = !checking && !failed && query.isSuccess ? query.data : null;
  const title = kind === "invoices" ? "Invoices" : "Quotes";
  const refresh = async () => {
    // Hide private content in the click's render before query notifications.
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <section aria-label={`Customer ${kind}`}>
      <Card className="h-full">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>
            <h3 className="text-base">{title}</h3>
          </CardTitle>
          <Button variant="outline" size="sm" disabled={checking} onClick={() => void refresh()}>
            Refresh {kind}
          </Button>
        </CardHeader>
        <CardContent>
          {checking ? (
            <p role="status">Loading {kind}…</p>
          ) : failed ? (
            <div role="alert" className="space-y-2 text-sm">
              <p>Could not load this customer's {kind}.</p>
              <Button variant="outline" size="sm" onClick={() => void refresh()}>
                Retry {kind}
              </Button>
            </div>
          ) : !result?.available ? (
            <p className="text-sm text-muted-foreground">
              {title} unavailable for this customer in the current session.
            </p>
          ) : result.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {kind} for this customer yet.</p>
          ) : (
            <>
              <CommercialRows result={result} />
              {result.hasMore ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {kind === "invoices"
                    ? "Showing the 25 most recently recorded invoices."
                    : "Showing the 25 most recent visible quotes."}
                </p>
              ) : null}
            </>
          )}
          <Button asChild variant="ghost" size="sm" className="mt-3">
            {kind === "invoices" ? (
              <Link to="/workspace/invoices">Open invoice workspace</Link>
            ) : (
              <Link to="/workspace/quotes">Open quote workspace</Link>
            )}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function PrivateCommercialHistory({
  accountId,
  customerId,
}: {
  accountId: string;
  customerId: string;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2" aria-label="Customer quotes and invoices">
      <CommercialSource accountId={accountId} customerId={customerId} kind="quotes" />
      <CommercialSource accountId={accountId} customerId={customerId} kind="invoices" />
    </section>
  );
}

export function CustomerCommercialHistory({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <PrivateCommercialHistory
      key={`${user.id}:${customerId}`}
      accountId={user.id}
      customerId={customerId}
    />
  );
}
