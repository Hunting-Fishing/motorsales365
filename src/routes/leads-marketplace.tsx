import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Crown, Lock, MapPin, Clock, Zap, Mail, Phone, User } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { listOpenLeadOffers, unlockLeadOffer } from "@/lib/lead-marketplace.functions";
import { formatPHP } from "@/lib/format";

const TITLE = "Lead Marketplace — Buy verified buyer leads";
const DESCRIPTION =
  "Verified buyer leads for dealers, repair shops, parts sellers and tow providers. Pay per unlock — Featured & Premium business plans only.";

export const Route = createFileRoute("/leads-marketplace")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: LeadMarketplacePage,
});

function LeadMarketplacePage() {
  const { user } = useAuth();
  const unlock = useServerFn(unlockLeadOffer);
  const [revealed, setRevealed] = useState<{
    offerId: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["lead-marketplace", "open"],
    queryFn: () => listOpenLeadOffers({ data: {} }),
    staleTime: 60_000,
  });

  const handleUnlock = async (offerId: string) => {
    if (!user) {
      toast.error("Sign in to unlock leads.");
      return;
    }
    setPendingId(offerId);
    try {
      const res = await unlock({ data: { offerId } });
      setRevealed({
        offerId,
        name: res.contact.name,
        email: res.contact.email,
        phone: res.contact.phone,
        notes: res.contact.notes,
      });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not unlock this lead.");
    } finally {
      setPendingId(null);
    }
  };

  const offers = data?.offers ?? [];

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Lead Marketplace</h1>
              <p className="text-muted-foreground">
                Verified buyer leads for dealers, shops and service providers.
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Pay per unlock to receive the buyer's full contact details. Unlocks are limited to{" "}
            <strong>Featured</strong> and <strong>Premium</strong> business plans —{" "}
            <Link to="/pricing" className="text-primary underline">
              compare plans
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <p className="text-muted-foreground">Loading available leads…</p>
        ) : offers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No leads available right now. Check back soon — new leads post throughout the day.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o: any) => {
              const isUnlocking = pendingId === o.id;
              const vehicle = [o.vehicle_year, o.vehicle_make, o.vehicle_model]
                .filter(Boolean)
                .join(" ");
              return (
                <Card
                  key={o.id}
                  className="flex flex-col overflow-hidden border-border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {o.category_slug?.replace(/-/g, " ")}
                    </Badge>
                    {o.urgency === "urgent" && (
                      <Badge className="bg-destructive text-destructive-foreground">
                        <Zap className="mr-1 h-3 w-3" /> Urgent
                      </Badge>
                    )}
                  </div>
                  {vehicle && (
                    <p className="mt-2 font-semibold">{vehicle}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                    {o.preview}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {(o.city || o.region) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[o.city, o.region].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {(o.budget_min_php || o.budget_max_php) && (
                      <span>
                        Budget: {o.budget_min_php ? formatPHP(Number(o.budget_min_php)) : "—"}
                        {o.budget_max_php
                          ? ` – ${formatPHP(Number(o.budget_max_php))}`
                          : ""}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(o.posted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Unlock for</p>
                      <p className="font-bold text-primary">
                        {Number(o.price_php) > 0 ? formatPHP(Number(o.price_php)) : "Free"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleUnlock(o.id)}
                      disabled={isUnlocking}
                    >
                      <Lock className="mr-1 h-3.5 w-3.5" />
                      {isUnlocking ? "Unlocking…" : "Unlock"}
                    </Button>
                  </div>
                  {(o.max_unlocks ?? 1) > 1 && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {o.unlocks_count}/{o.max_unlocks} buyers unlocked
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!revealed} onOpenChange={(v) => !v && setRevealed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lead unlocked</DialogTitle>
            <DialogDescription>
              Contact this buyer directly. Saved in your unlocks history.
            </DialogDescription>
          </DialogHeader>
          {revealed && (
            <div className="space-y-2 text-sm">
              {revealed.name && (
                <p className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" /> {revealed.name}
                </p>
              )}
              {revealed.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />{" "}
                  <a href={`tel:${revealed.phone}`} className="text-primary hover:underline">
                    {revealed.phone}
                  </a>
                </p>
              )}
              {revealed.email && (
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />{" "}
                  <a href={`mailto:${revealed.email}`} className="text-primary hover:underline">
                    {revealed.email}
                  </a>
                </p>
              )}
              {revealed.notes && (
                <p className="rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
                  {revealed.notes}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
