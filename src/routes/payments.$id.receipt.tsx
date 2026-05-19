import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPHP, formatDate } from "@/lib/format";
import { Printer, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/payments/$id/receipt")({
  component: ReceiptPage,
});

function ReceiptPage() {
  const { id } = Route.useParams();
  const [payment, setPayment] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        setError(error?.message ?? "Receipt not found");
        setLoading(false);
        return;
      }
      setPayment(data);
      const [{ data: prof }, listingResp] = await Promise.all([
        supabase.from("profiles").select("full_name,business_name,business_address,phone,first_name,last_name").eq("id", data.user_id).maybeSingle(),
        data.listing_id
          ? supabase.from("listings").select("id,title,price_php").eq("id", data.listing_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      setProfile(prof);
      setListing((listingResp as any).data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-3xl p-8 text-sm text-muted-foreground">Loading receipt…</div>;
  }
  if (error || !payment) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <p className="text-sm text-destructive">{error ?? "Receipt not found."}</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/dashboard/billing">Back to billing</Link></Button>
      </div>
    );
  }

  const isPaid = payment.status === "paid";
  const docLabel = isPaid ? "Receipt" : "Invoice";
  const docNumber = `${isPaid ? "RCT" : "INV"}-${String(payment.id).slice(0, 8).toUpperCase()}`;
  const customerName =
    profile?.business_name ||
    profile?.full_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "Customer";

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/billing"><ArrowLeft className="mr-1 h-4 w-4" />Back to billing</Link>
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />Print / Save as PDF
          </Button>
        </div>

        <article className="rounded-xl border border-border bg-card p-8 shadow-sm print:border-0 print:shadow-none">
          <header className="mb-8 flex items-start justify-between border-b border-border pb-6">
            <div>
              <div className="font-display text-2xl font-bold">365 Motorsales</div>
              <div className="mt-1 text-xs text-muted-foreground">
                365motorsales.com<br />
                partners@365motorsales.ph
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{docLabel}</div>
              <div className="mt-1 font-mono text-sm font-semibold">{docNumber}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Issued {formatDate(payment.paid_at ?? payment.created_at)}
              </div>
            </div>
          </header>

          <section className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Billed to</div>
              <div className="mt-1 text-sm font-medium">{customerName}</div>
              {profile?.business_address && (
                <div className="text-xs text-muted-foreground">{profile.business_address}</div>
              )}
              {profile?.phone && (
                <div className="text-xs text-muted-foreground">{profile.phone}</div>
              )}
            </div>
            <div className="sm:text-right">
              <div className="text-xs uppercase text-muted-foreground">Status</div>
              <div className={`mt-1 text-sm font-semibold ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                {payment.status.toUpperCase()}
              </div>
              {payment.method && (
                <div className="text-xs text-muted-foreground">via {payment.method}</div>
              )}
              {payment.reference && (
                <div className="text-xs text-muted-foreground">Ref: {payment.reference}</div>
              )}
            </div>
          </section>

          <table className="w-full border-t border-border text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-3">Description</th>
                <th className="py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="py-3">
                  <div className="font-medium capitalize">{payment.kind?.replace(/_/g, " ")}</div>
                  {listing ? (
                    <div className="text-xs text-muted-foreground">For listing: {listing.title}</div>
                  ) : payment.notes ? (
                    <div className="text-xs text-muted-foreground">{payment.notes}</div>
                  ) : null}
                </td>
                <td className="py-3 text-right font-medium">{formatPHP(payment.amount_php)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-border">
                <td className="py-3 text-right text-xs uppercase text-muted-foreground">Total</td>
                <td className="py-3 text-right font-display text-lg font-bold">{formatPHP(payment.amount_php)}</td>
              </tr>
            </tfoot>
          </table>

          <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
            Thank you for using 365 Motorsales. For questions about this {docLabel.toLowerCase()},
            email <a href="mailto:partners@365motorsales.ph" className="text-primary">partners@365motorsales.ph</a> and
            reference <span className="font-mono">{docNumber}</span>.
          </footer>
        </article>
      </div>
    </div>
  );
}
