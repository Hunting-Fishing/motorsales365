import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Shield,
  Wrench,
  Banknote,
  FileText,
  ClipboardCheck,
  Package,
  Store,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Download,
  ShieldCheck,
} from "lucide-react";


import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BuyerDocumentChecklist } from "@/components/buyer-document-checklist";

type ChecklistItem = { id: string; label: string; hint: string | null };
type Checklist = {
  id: string;
  title: string;
  pdf_url: string | null;
  items: ChecklistItem[];
};

async function fetchChecklist(categorySlug: string | null): Promise<Checklist | null> {
  // Try category-specific first, then fall back to any active default (category_slug is null)
  const query = supabase
    .from("buyer_checklists")
    .select("id, title, pdf_url, category_slug, buyer_checklist_items(id, label, hint, position)")
    .eq("is_active", true);
  const { data } = await query;
  if (!data || data.length === 0) return null;
  const match =
    data.find((c: any) => categorySlug && c.category_slug === categorySlug) ??
    data.find((c: any) => c.category_slug === null) ??
    data[0];
  if (!match) return null;
  const items = (match as any).buyer_checklist_items ?? [];
  items.sort((a: any, b: any) => a.position - b.position);
  return {
    id: match.id,
    title: match.title,
    pdf_url: (match as any).pdf_url,
    items: items.map((i: any) => ({ id: i.id, label: i.label, hint: i.hint })),
  };
}

async function fetchGuides() {
  const { data } = await supabase
    .from("buyer_checklists")
    .select("id, title, pdf_url")
    .eq("is_active", true)
    .not("pdf_url", "is", null);
  return (data ?? []) as Array<{ id: string; title: string; pdf_url: string }>;
}

type Props = {
  listingId: string;
  listingUserId: string;
  categorySlug: string | null;
  attributes: Record<string, any> | null;
  ltoVerified?: boolean;
};

export function BuyerResourcesCard({
  listingId,
  listingUserId,
  categorySlug,
  attributes,
  ltoVerified,
}: Props) {
  const { data: checklist } = useQuery({
    queryKey: ["buyer-checklist", categorySlug],
    queryFn: () => fetchChecklist(categorySlug),
    staleTime: 5 * 60 * 1000,
  });
  const { data: guides } = useQuery({
    queryKey: ["buyer-guides"],
    queryFn: fetchGuides,
    staleTime: 5 * 60 * 1000,
  });

  const [openChecklist, setOpenChecklist] = useState(false);
  const [openGuides, setOpenGuides] = useState(false);

  const partsSearch = useMemo(() => {
    const params = new URLSearchParams();
    const make = attributes?.make ?? attributes?.brand;
    const model = attributes?.model;
    const year = attributes?.year;
    if (make) params.set("make", String(make));
    if (model) params.set("model", String(model));
    if (year) params.set("year", String(year));
    const qs = params.toString();
    return qs ? `/parts?${qs}` : "/parts";
  }, [attributes]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-3 py-2">
        <h3 className="font-display text-sm font-semibold">Buyer resources</h3>
        <p className="text-[11px] text-muted-foreground">
          Help &amp; safety for this listing
        </p>
      </div>
      <ul className="divide-y divide-border text-sm">
        {/* LTO / Verification status */}
        <li>
          <Link
            to="/verified"
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50"
          >
            <IconBox className={ltoVerified ? "bg-emerald-500/10 text-emerald-600" : ""}>
              <ShieldCheck className="h-3.5 w-3.5" />
            </IconBox>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">LTO &amp; document check</span>
              <span className="block text-[11px] text-muted-foreground">
                {ltoVerified ? "OR/CR reviewed by 365" : "How we verify listings"}
              </span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </li>

        {/* Buyer checklist */}
        <li>
          <Dialog open={openChecklist} onOpenChange={setOpenChecklist}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50"
              >
                <IconBox>
                  <ClipboardCheck className="h-3.5 w-3.5" />
                </IconBox>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">PH buyer checklist</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Tick before you pay
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{checklist?.title ?? "PH buyer checklist"}</DialogTitle>
                <DialogDescription>
                  Confirm each item in person before you hand over any payment.
                </DialogDescription>
              </DialogHeader>
              <BuyerDocumentChecklist
                listingId={listingId}
                items={checklist?.items ?? undefined}
                pdfUrl={checklist?.pdf_url ?? null}
                embedded
              />
            </DialogContent>
          </Dialog>
        </li>

        {/* Parts for this vehicle */}
        <li>
          <Link
            to={partsSearch as any}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50"
          >
            <IconBox>
              <Package className="h-3.5 w-3.5" />
            </IconBox>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Parts &amp; accessories</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                Find parts that fit this vehicle
              </span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </li>

        {/* More from this seller */}
        <li>
          <Link
            to="/seller/$id"
            params={{ id: listingUserId }}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50"
          >
            <IconBox>
              <Store className="h-3.5 w-3.5" />
            </IconBox>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">More from this seller</span>
              <span className="block text-[11px] text-muted-foreground">
                See other listings &amp; reviews
              </span>
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </li>

        {/* Inspection — coming soon */}
        <ComingSoonRow icon={<Wrench className="h-3.5 w-3.5" />} label="Pre-purchase inspection" />
        <ComingSoonRow icon={<Shield className="h-3.5 w-3.5" />} label="Insurance quote" />
        <ComingSoonRow icon={<Banknote className="h-3.5 w-3.5" />} label="Financing options" />
        <ComingSoonRow icon={<FileText className="h-3.5 w-3.5" />} label="OR/CR renewal help" />

        {/* Safety guides */}
        {(guides?.length ?? 0) > 0 && (
          <li>
            <Dialog open={openGuides} onOpenChange={setOpenGuides}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50"
                >
                  <IconBox className="bg-primary/10 text-primary">
                    <BookOpen className="h-3.5 w-3.5" />
                  </IconBox>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">Safety guides (PDF)</span>
                    <span className="block text-[11px] text-muted-foreground">
                      Download &amp; save for later
                    </span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Buyer safety guides</DialogTitle>
                  <DialogDescription>
                    Download and review before viewing a used vehicle.
                  </DialogDescription>
                </DialogHeader>
                <ul className="mt-2 space-y-2">
                  {guides!.map((g) => (
                    <li key={g.id}>
                      <a
                        href={g.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted/50"
                      >
                        <Download className="h-4 w-4 text-primary" />
                        <span className="flex-1">{g.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </DialogContent>
            </Dialog>
          </li>
        )}
      </ul>
    </div>
  );
}

function IconBox({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ${className}`}
    >
      {children}
    </span>
  );
}

function ComingSoonRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li>
      <div className="flex items-center gap-2.5 px-3 py-2 opacity-70">
        <IconBox>{icon}</IconBox>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{label}</span>
          <span className="block text-[11px] text-muted-foreground">Coming soon</span>
        </span>
      </div>
    </li>
  );
}
