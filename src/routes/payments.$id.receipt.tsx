import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatPHP, formatDate } from "@/lib/format";
import { Printer, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { buildReceiptLines, assertReceiptOrder } from "@/lib/receipt-lines";

export const Route = createFileRoute("/payments/$id/receipt")({
  component: ReceiptPage,
});

function ReceiptPage() {
  const { id } = Route.useParams();
  const [payment, setPayment] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
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
      const [{ data: prof }, listingResp, { data: items }] = await Promise.all([
        supabase.from("profiles").select("full_name,business_name,business_address,phone,first_name,last_name").eq("id", data.user_id).maybeSingle(),
        data.listing_id
          ? supabase.from("listings").select("id,title,price_php").eq("id", data.listing_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase
          .from("payment_line_items")
          .select("*")
          .eq("payment_id", data.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
      setProfile(prof);
      setListing((listingResp as any).data);
      setLineItems(items ?? []);
      setLoading(false);
    })();
  }, [id]);

  const toggle = (key: string) => setExpanded((m) => ({ ...m, [key]: !m[key] }));

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

          {lineItems.length > 0 ? (() => {
            const net = Number(payment.amount_php ?? 0);
            const itemsTotal = lineItems.reduce((s, it) => s + Number(it.amount_php ?? 0), 0);
            const itemsCredit = lineItems.reduce(
              (s, it) => s + Number(it.prorated_credit_php ?? 0),
              0,
            );
            const DAY = 86_400_000;
            return (
              <table className="w-full border-t border-border text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-3">Description</th>
                    <th className="py-3 text-right">Charge</th>
                    <th className="py-3 text-right">Credit</th>
                    <th className="py-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((it) => {
                    const amount = Number(it.amount_php ?? 0);
                    const itemCredit = Number(it.prorated_credit_php ?? 0);
                    const itemNet = Math.max(0, Math.round(amount - itemCredit));
                    const periodStart = it.period_start ? new Date(it.period_start) : null;
                    const periodEnd = it.period_end ? new Date(it.period_end) : null;
                    const calcAt = it.credit_calculated_at
                      ? new Date(it.credit_calculated_at)
                      : payment.paid_at
                        ? new Date(payment.paid_at)
                        : null;
                    const prevAmount = Number(it.previous_amount_php ?? 0);
                    const totalDays = periodStart && periodEnd
                      ? Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY))
                      : null;
                    const remainingDays = periodEnd && calcAt
                      ? Math.max(0, Math.round((periodEnd.getTime() - calcAt.getTime()) / DAY))
                      : null;
                    const canExpand = itemCredit > 0 && periodStart && periodEnd && prevAmount > 0;
                    const isOpen = !!expanded[it.id];
                    return (
                      <>
                        <tr key={it.id} className="border-t border-border align-top">
                          <td className="py-3">
                            <div className="flex items-start gap-2">
                              {canExpand ? (
                                <button
                                  type="button"
                                  onClick={() => toggle(it.id)}
                                  aria-expanded={isOpen}
                                  aria-label={isOpen ? "Hide breakdown" : "Show breakdown"}
                                  className="mt-0.5 text-muted-foreground hover:text-foreground print:hidden"
                                >
                                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              ) : (
                                <span className="w-4 print:hidden" />
                              )}
                              <div>
                                <div className="font-medium capitalize">{it.label}</div>
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{it.kind}</div>
                                {it.description && (
                                  <div className="text-xs text-muted-foreground">{it.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right font-medium">{formatPHP(amount)}</td>
                          <td className="py-3 text-right text-emerald-600">
                            {itemCredit > 0 ? `− ${formatPHP(itemCredit)}` : "—"}
                          </td>
                          <td className="py-3 text-right font-medium">{formatPHP(itemNet)}</td>
                        </tr>
                        {canExpand && (isOpen || typeof window === "undefined") && (
                          <tr key={`${it.id}-detail`} className="border-t border-dashed border-border bg-muted/30 print:table-row">
                            <td colSpan={4} className="py-3">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                Proration breakdown — {it.label}
                              </div>
                              <dl className="mt-2 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                                <div>
                                  <dt className="text-muted-foreground">Period start</dt>
                                  <dd className="font-mono">{formatDate(periodStart)}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70 break-all">{it.period_start}</dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">Period end</dt>
                                  <dd className="font-mono">{formatDate(periodEnd)}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70 break-all">{it.period_end}</dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">
                                    {it.credit_calculated_at ? "Calculated at" : "Paid at"}
                                  </dt>
                                  <dd className="font-mono">{calcAt ? formatDate(calcAt) : "—"}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70 break-all">
                                    {it.credit_calculated_at ?? payment.paid_at ?? ""}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">Previous amount</dt>
                                  <dd className="font-mono">{formatPHP(prevAmount)}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70">raw: {prevAmount}</dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">totalDays</dt>
                                  <dd className="font-mono">{totalDays}</dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">remainingDays</dt>
                                  <dd className="font-mono">{remainingDays}</dd>
                                </div>
                              </dl>
                              {totalDays && remainingDays !== null && (
                                <div className="mt-2 font-mono text-xs text-muted-foreground">
                                  {formatPHP(prevAmount)} × {remainingDays} ÷ {totalDays} ={" "}
                                  <span className="text-emerald-600">{formatPHP(itemCredit)}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border text-xs text-muted-foreground">
                    <td className="py-2 text-right uppercase" colSpan={1}>Subtotal</td>
                    <td className="py-2 text-right">{formatPHP(itemsTotal)}</td>
                    <td className="py-2 text-right text-emerald-600">
                      {itemsCredit > 0 ? `− ${formatPHP(itemsCredit)}` : "—"}
                    </td>
                    <td className="py-2 text-right">{formatPHP(Math.max(0, itemsTotal - itemsCredit))}</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td colSpan={3} className="py-3 text-right text-xs uppercase text-muted-foreground">
                      Net due
                    </td>
                    <td className="py-3 text-right font-display text-lg font-bold">{formatPHP(net)}</td>
                  </tr>
                </tfoot>
              </table>
            );
          })() : (
          (() => {
            const credit = Number(payment.prorated_credit_php ?? 0);
            const gross = Number(payment.gross_amount_php ?? 0);
            const net = Number(payment.amount_php ?? 0);
            const planPrice = Number(payment.plan_price_php ?? 0);
            const boost = Number(payment.boost_amount_php ?? 0);
            const addons = Number(payment.addons_amount_php ?? 0);
            const hasSplit = planPrice > 0 || boost > 0 || addons > 0;
            const subtotal = hasSplit
              ? planPrice + boost + addons
              : gross > 0
                ? gross
                : net;
            const hasBreakdown = credit > 0 || gross > 0 || hasSplit;
            const planLabel = payment.new_plan
              ? `Plan — ${payment.new_plan}`
              : payment.kind?.replace(/_/g, " ") ?? "Plan";

            // Automated ordering check: in dev, throw if a future edit ever
            // reorders charges/credit/net incorrectly. Silent in production.
            if (import.meta.env.DEV) {
              try {
                assertReceiptOrder(
                  buildReceiptLines({
                    plan_price_php: planPrice,
                    boost_amount_php: boost,
                    addons_amount_php: addons,
                    gross_amount_php: gross,
                    prorated_credit_php: credit,
                    amount_php: net,
                  }),
                );
              } catch (e) {
                console.error("[receipt] ordering check failed:", e);
              }
            }
            return (
              <table className="w-full border-t border-border text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-3">Description</th>
                    <th className="py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {hasSplit ? (
                    <>
                      {planPrice > 0 && (
                        <tr className="border-t border-border">
                          <td className="py-3">
                            <div className="font-medium capitalize">{planLabel}</div>
                            {payment.previous_plan && payment.new_plan && (
                              <div className="text-xs text-muted-foreground">
                                Changed from {payment.previous_plan} to {payment.new_plan}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">Monthly plan price</div>
                          </td>
                          <td className="py-3 text-right font-medium">{formatPHP(planPrice)}</td>
                        </tr>
                      )}
                      {boost > 0 && (
                        <tr className="border-t border-border">
                          <td className="py-3">
                            <div className="font-medium">Boosted listing renewal</div>
                            {listing && (
                              <div className="text-xs text-muted-foreground">For listing: {listing.title}</div>
                            )}
                          </td>
                          <td className="py-3 text-right font-medium">{formatPHP(boost)}</td>
                        </tr>
                      )}
                      {addons > 0 && (
                        <tr className="border-t border-border">
                          <td className="py-3">
                            <div className="font-medium">Add-ons</div>
                            {payment.addons_description && (
                              <div className="text-xs text-muted-foreground">{payment.addons_description}</div>
                            )}
                          </td>
                          <td className="py-3 text-right font-medium">{formatPHP(addons)}</td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr className="border-t border-border">
                      <td className="py-3">
                        <div className="font-medium capitalize">
                          {payment.new_plan
                            ? `Plan upgrade — ${payment.new_plan}`
                            : payment.kind?.replace(/_/g, " ")}
                        </div>
                        {payment.previous_plan && (
                          <div className="text-xs text-muted-foreground">
                            Changed from {payment.previous_plan}
                            {payment.new_plan ? ` to ${payment.new_plan}` : ""}
                          </div>
                        )}
                        {listing ? (
                          <div className="text-xs text-muted-foreground">For listing: {listing.title}</div>
                        ) : payment.notes ? (
                          <div className="text-xs text-muted-foreground">{payment.notes}</div>
                        ) : null}
                      </td>
                      <td className="py-3 text-right font-medium">{formatPHP(subtotal)}</td>
                    </tr>
                  )}
                  {credit > 0 && (() => {
                    const periodStart = payment.period_start ? new Date(payment.period_start) : null;
                    const periodEnd = payment.period_end ? new Date(payment.period_end) : null;
                    const calcAt = payment.credit_calculated_at
                      ? new Date(payment.credit_calculated_at)
                      : payment.paid_at
                        ? new Date(payment.paid_at)
                        : null;
                    const prevPrice = Number(payment.previous_plan_price_php ?? 0);
                    const DAY = 86_400_000;
                    const totalDays = periodStart && periodEnd
                      ? Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / DAY))
                      : null;
                    const remainingDays = periodEnd && calcAt
                      ? Math.max(0, Math.round((periodEnd.getTime() - calcAt.getTime()) / DAY))
                      : null;
                    const hasInputs = periodStart && periodEnd && prevPrice > 0;
                    return (
                      <>
                        <tr className="border-t border-border text-emerald-600">
                          <td className="py-3">
                            <div className="font-medium">Prorated credit</div>
                            <div className="text-xs text-emerald-700/80">
                              Unused days from {payment.previous_plan ?? "previous plan"}
                            </div>
                          </td>
                          <td className="py-3 text-right font-medium">− {formatPHP(credit)}</td>
                        </tr>
                        {hasInputs && (
                          <tr className="border-t border-dashed border-border bg-muted/30">
                            <td colSpan={2} className="py-3">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                Proration calculation
                              </div>
                              <dl className="mt-2 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                                <div>
                                  <dt className="text-muted-foreground">Billing cycle start</dt>
                                  <dd className="font-mono">{formatDate(periodStart)}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70 break-all">
                                    {payment.period_start}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">Billing cycle end</dt>
                                  <dd className="font-mono">{formatDate(periodEnd)}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70 break-all">
                                    {payment.period_end}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">
                                    {payment.credit_calculated_at ? "Calculated at" : "Paid at"}
                                  </dt>
                                  <dd className="font-mono">{calcAt ? formatDate(calcAt) : "—"}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70 break-all">
                                    {payment.credit_calculated_at ?? payment.paid_at ?? ""}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">
                                    {payment.previous_plan ?? "Previous plan"} monthly
                                  </dt>
                                  <dd className="font-mono">{formatPHP(prevPrice)}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70">
                                    raw: {prevPrice}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">totalDays</dt>
                                  <dd className="font-mono">{totalDays}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70">
                                    (period_end − period_start) ÷ 86 400 000 ms
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-muted-foreground">remainingDays</dt>
                                  <dd className="font-mono">{remainingDays}</dd>
                                  <dd className="font-mono text-[10px] text-muted-foreground/70">
                                    (period_end − {payment.credit_calculated_at ? "credit_calculated_at" : "paid_at"}) ÷ 86 400 000 ms
                                  </dd>
                                </div>
                              </dl>
                              {totalDays && remainingDays !== null && (
                                <div className="mt-2 font-mono text-xs text-muted-foreground">
                                  {formatPHP(prevPrice)} × {remainingDays} ÷ {totalDays} ={" "}
                                  <span className="text-emerald-600">{formatPHP(credit)}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
                <tfoot>
                  {hasBreakdown && (
                    <tr className="border-t border-border text-xs text-muted-foreground">
                      <td className="py-2 text-right uppercase">Subtotal</td>
                      <td className="py-2 text-right">{formatPHP(subtotal)}</td>
                    </tr>
                  )}
                  {credit > 0 && (
                    <tr className="text-xs text-muted-foreground">
                      <td className="py-1 text-right uppercase">Credit applied</td>
                      <td className="py-1 text-right text-emerald-600">− {formatPHP(credit)}</td>
                    </tr>
                  )}
                  <tr className="border-t border-border">
                    <td className="py-3 text-right text-xs uppercase text-muted-foreground">
                      {credit > 0 ? "Net due" : "Total"}
                    </td>
                    <td className="py-3 text-right font-display text-lg font-bold">{formatPHP(net)}</td>
                  </tr>
                </tfoot>
              </table>
            );
          })()
          )}

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
