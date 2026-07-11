import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Package, Store, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ListingPreview = {
  kind: "listing";
  id: string;
  title: string | null;
  price_php: number | null;
  city: string | null;
  province: string | null;
  thumb: string | null;
  seller_name: string | null;
  seller_id: string | null;
};

type BusinessPreview = {
  kind: "business";
  id: string;
  name: string | null;
  slug: string | null;
  city: string | null;
  province: string | null;
  logo: string | null;
};

type SellerPreview = {
  kind: "seller";
  id: string;
  name: string | null;
  member_number: string | null;
  avatar: string | null;
};

export type TargetPreview = ListingPreview | BusinessPreview | SellerPreview;

type Props = {
  listingId?: string;
  businessId?: string;
  sellerId?: string;
  onResolved?: (p: TargetPreview | null, canonicalUrl: string | null) => void;
  onClear?: () => void;
};

export function ReportTargetPreview({
  listingId,
  businessId,
  sellerId,
  onResolved,
  onClear,
}: Props) {
  const [preview, setPreview] = useState<TargetPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (listingId) {
          const { data } = await supabase
            .from("listings")
            .select(
              "id, title, price_php, city, province, user_id, listing_media(url, sort_order)",
            )
            .eq("id", listingId)
            .maybeSingle();
          if (!data) {
            if (!cancelled) {
              setPreview(null);
              onResolved?.(null, null);
            }
            return;
          }
          const media = ((data as any).listing_media ?? []).sort(
            (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
          );
          let sellerName: string | null = null;
          if ((data as any).user_id) {
            const { data: p } = await supabase
              .from("profiles")
              .select("business_name, full_name, first_name, last_name")
              .eq("id", (data as any).user_id)
              .maybeSingle();
            sellerName =
              (p as any)?.business_name ||
              (p as any)?.full_name ||
              [(p as any)?.first_name, (p as any)?.last_name]
                .filter(Boolean)
                .join(" ") ||
              null;
          }
          const pv: ListingPreview = {
            kind: "listing",
            id: (data as any).id,
            title: (data as any).title,
            price_php: (data as any).price_php,
            city: (data as any).city,
            province: (data as any).province,
            thumb: media[0]?.url ?? null,
            seller_name: sellerName,
            seller_id: (data as any).user_id ?? null,
          };
          if (!cancelled) {
            setPreview(pv);
            onResolved?.(pv, `/listing/${pv.id}`);
          }
        } else if (businessId) {
          const { data } = await supabase
            .from("businesses")
            .select("id, name, slug, city, province, logo_url")
            .eq("id", businessId)
            .maybeSingle();
          if (!data) {
            if (!cancelled) {
              setPreview(null);
              onResolved?.(null, null);
            }
            return;
          }
          const pv: BusinessPreview = {
            kind: "business",
            id: (data as any).id,
            name: (data as any).name,
            slug: (data as any).slug,
            city: (data as any).city,
            province: (data as any).province,
            logo: (data as any).logo_url ?? null,
          };
          if (!cancelled) {
            setPreview(pv);
            onResolved?.(
              pv,
              pv.slug ? `/business/${pv.slug}` : `/business/${pv.id}`,
            );
          }
        } else if (sellerId) {
          const { data } = await supabase
            .from("profiles")
            .select(
              "id, member_number, business_name, full_name, first_name, last_name, avatar_url",
            )
            .eq("id", sellerId)
            .maybeSingle();
          if (!data) {
            if (!cancelled) {
              setPreview(null);
              onResolved?.(null, null);
            }
            return;
          }
          const pv: SellerPreview = {
            kind: "seller",
            id: (data as any).id,
            name:
              (data as any).business_name ||
              (data as any).full_name ||
              [(data as any).first_name, (data as any).last_name]
                .filter(Boolean)
                .join(" ") ||
              null,
            member_number: (data as any).member_number ?? null,
            avatar: (data as any).avatar_url ?? null,
          };
          if (!cancelled) {
            setPreview(pv);
            onResolved?.(pv, `/u/${pv.id}`);
          }
        } else {
          if (!cancelled) {
            setPreview(null);
            onResolved?.(null, null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, businessId, sellerId]);

  if (!listingId && !businessId && !sellerId) return null;

  if (loading) {
    return (
      <div className="mb-5 h-24 animate-pulse rounded-lg border border-border bg-secondary/30" />
    );
  }

  if (!preview) {
    return (
      <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
        <p className="font-medium">We couldn't find that item.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          It may have been removed. You can still describe the issue below.
        </p>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-2 text-xs font-medium underline"
          >
            Clear and file a general report
          </button>
        )}
      </div>
    );
  }

  const url =
    preview.kind === "listing"
      ? `/listing/${preview.id}`
      : preview.kind === "business"
        ? preview.slug
          ? `/business/${preview.slug}`
          : `/business/${preview.id}`
        : `/u/${preview.id}`;

  const Icon =
    preview.kind === "listing" ? Package : preview.kind === "business" ? Store : User;

  const title =
    preview.kind === "listing"
      ? preview.title
      : preview.kind === "business"
        ? preview.name
        : preview.name;

  const media =
    preview.kind === "listing"
      ? preview.thumb
      : preview.kind === "business"
        ? preview.logo
        : preview.avatar;

  return (
    <div className="mb-5 rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          You're reporting this {preview.kind}
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            Not the right item?
          </button>
        )}
      </div>
      <div className="flex gap-3">
        {media ? (
          <img
            src={media}
            alt=""
            className="h-16 w-16 shrink-0 rounded-md object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{title ?? "Untitled"}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {preview.kind === "listing" && (
              <>
                {preview.price_php != null && (
                  <span className="font-medium text-foreground">
                    ₱{preview.price_php.toLocaleString()}
                  </span>
                )}
                {preview.price_php != null &&
                  (preview.city || preview.province) &&
                  " · "}
                {[preview.city, preview.province].filter(Boolean).join(", ")}
                {preview.seller_name && (
                  <>
                    {" · "}Seller: <span className="text-foreground">{preview.seller_name}</span>
                  </>
                )}
              </>
            )}
            {preview.kind === "business" &&
              [preview.city, preview.province].filter(Boolean).join(", ")}
            {preview.kind === "seller" && preview.member_number && (
              <>Member #{preview.member_number}</>
            )}
          </div>
          <Link
            to={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View original <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
