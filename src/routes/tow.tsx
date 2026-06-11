import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Truck, PhoneCall, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site-layout";
import { Input } from "@/components/ui/input";
import { FeaturedTowProviders } from "@/components/tow/featured-tow-providers";
import { TowRequestForm } from "@/components/towing/tow-request-form";

const searchSchema = z.object({
  listing: z.string().optional(),
  provider: z.string().optional(),
});

export const Route = createFileRoute("/tow")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Request a tow — 365 MotorSales Philippines" },
      {
        name: "description",
        content:
          "Arrange towing or trucking for a vehicle anywhere in the Philippines. Get matched with verified providers.",
      },
      { property: "og:title", content: "Request a tow — 365 MotorSales Philippines" },
      {
        property: "og:description",
        content:
          "Tell us what's wrong, where you are, and what you're driving — verified PH towing providers respond fast.",
      },
    ],
  }),
  component: TowPage,
});

type RequestedProvider = { id: string; name: string } | null;

function TowPage() {
  const search = Route.useSearch();
  const [requestedProvider, setRequestedProvider] = useState<RequestedProvider>(null);
  const [providerSearch, setProviderSearch] = useState("");
  const [providerOptions, setProviderOptions] = useState<{ id: string; name: string }[]>([]);

  // Hydrate provider from ?provider= (listing id of a tow business listing,
  // or a business id directly — try businesses first, fall back to listings.user_id).
  useEffect(() => {
    if (!search.provider) {
      setRequestedProvider(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: biz } = await supabase
        .from("businesses")
        .select("id,name")
        .eq("id", search.provider!)
        .maybeSingle();
      if (cancelled) return;
      if (biz) {
        setRequestedProvider({ id: biz.id, name: biz.name });
        return;
      }
      const { data: listing } = await supabase
        .from("listings")
        .select("title,user_id")
        .eq("id", search.provider!)
        .maybeSingle();
      if (cancelled || !listing) return;
      setRequestedProvider({ id: listing.user_id, name: listing.title });
    })();
    return () => {
      cancelled = true;
    };
  }, [search.provider]);

  // Typeahead for "request a specific provider" search slot
  useEffect(() => {
    const q = providerSearch.trim();
    if (q.length < 2) {
      setProviderOptions([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("businesses")
      .select("id,name")
      .ilike("name", `%${q}%`)
      .limit(8)
      .then(({ data }) => {
        if (cancelled) return;
        setProviderOptions(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [providerSearch]);

  return (
    <SiteLayout>
      <div className="border-b border-border bg-secondary/40">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold md:text-4xl">Request a tow</h1>
              <p className="text-muted-foreground">
                Tell us what's wrong, where you are, and what you're driving — nearby 365
                Dispatch providers will respond.
              </p>
            </div>
          </div>
          {requestedProvider && (
            <div className="mt-4 rounded-lg border border-border bg-card px-4 py-3 text-sm">
              Sending this request directly to{" "}
              <span className="font-semibold">{requestedProvider.name}</span>.
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto space-y-8 px-4 py-8">
        <FeaturedTowProviders region={null} />

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">Tell us about the tow</h2>
              <p className="text-sm text-muted-foreground">
                One form covers emergencies, scheduled tows, and long-distance transport.
              </p>
            </div>
          </div>

          <TowRequestForm
            seedListingId={search.listing ?? null}
            requestedProviderId={requestedProvider?.id ?? null}
            requestedProviderName={requestedProvider?.name ?? null}
            onClearRequestedProvider={() => {
              setRequestedProvider(null);
              setProviderSearch("");
            }}
            providerSearchSlot={
              <>
                <Input
                  className="mt-2"
                  placeholder="Type a tow company name…"
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                />
                {providerOptions.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-card">
                    {providerOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setRequestedProvider(opt);
                          setProviderSearch("");
                          setProviderOptions([]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            }
          />
        </section>

        <aside className="grid gap-4 rounded-xl border border-border bg-card p-6 text-sm sm:grid-cols-3">
          <div className="flex gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">Verified PH providers</div>
              <div className="text-muted-foreground">Vetted tow businesses on 365 Dispatch.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">24/7 roadside coverage</div>
              <div className="text-muted-foreground">Emergency requests reach nearby drivers fast.</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <div>
              <div className="font-medium">Flatbed, wheel-lift, heavy-duty</div>
              <div className="text-muted-foreground">From sedans to heavy equipment.</div>
            </div>
          </div>
        </aside>

        <p className="text-xs text-muted-foreground">
          Browsing for a tow provider?{" "}
          <Link
            to="/browse/$category"
            params={{ category: "towing" }}
            className="font-medium text-primary underline"
          >
            See towing & transport services
          </Link>
          .
        </p>
      </div>
    </SiteLayout>
  );
}
