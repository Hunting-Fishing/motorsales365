import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, Eye, EyeOff, Plus, Trash2, History, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TemplateCard } from "@/components/qr-ads/template-card";
import { QrAdTemplateUpload } from "@/components/qr-ads/template-upload-dialog";
import { useSignedCustomTemplates } from "@/components/qr-ads/use-signed-custom-templates";
import { TEMPLATES } from "@/lib/qr-ads/templates";
import type { ShareTemplate } from "@/lib/qr-ads/types";
import {
  CATEGORY_TREE,
  categoryLabel,
  subcategoryLabel,
  categoryVisual,
  UNCATEGORIZED_KEY,
  type CategoryKey,
} from "@/lib/qr-ads/categories";
import { listQrAdLayouts } from "@/lib/qr-ad-layouts.functions";
import {
  listQrAdTemplates,
  deleteQrAdTemplate,
  setBuiltinHidden,
  type CustomTemplateRow,
  type BuiltinCategoryRow,
} from "@/lib/qr-ad-templates.functions";
import { siteOrigin } from "@/lib/site-config";
import { prewarmBase, prewarmQr } from "@/lib/qr-ads/compose";


const adsSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/dashboard/qr-ads")({
  validateSearch: zodValidator(adsSearchSchema),
  component: QrAdsPage,
  head: () => ({
    meta: [
      { title: "Your QR Advertisements — 365 Motor Sales" },
      {
        name: "description",
        content:
          "Download and share branded 365 Motor Sales ads with your personal referral QR code baked in.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function matchesQuery(t: ShareTemplate, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const cat = categoryLabel(t.category).toLowerCase();
  const sub = subcategoryLabel(t.subcategory).toLowerCase();
  return (
    t.label.toLowerCase().includes(needle) ||
    (t.description ?? "").toLowerCase().includes(needle) ||
    cat.includes(needle) ||
    sub.includes(needle)
  );
}

type StaffRow = {
  referral_code: string;
  full_name: string;
  active: boolean;
};

function customToTemplate(row: CustomTemplateRow): ShareTemplate {
  return {
    id: `custom:${row.id}`,
    label: row.label,
    description: row.description ?? "",
    width: row.width,
    height: row.height,
    kind: "image",
    imageUrl: row.image_url,
    background: "#ffffff",
    qr: {
      cx: Number(row.qr_cx),
      cy: Number(row.qr_cy),
      size: Number(row.qr_size),
      platePadding: 0,
      plateRadius: 0,
    },
    shareText: row.share_text,
    category: row.category ?? undefined,
    subcategory: row.subcategory ?? undefined,
  };
}


function QrAdsPage() {
  const { user, realIsAdmin, loading: authLoading } = useAuth();
  const isAdmin = realIsAdmin;
  const navigate = useNavigate();
  const { q } = Route.useSearch();
  const [queryInput, setQueryInput] = useState(q);
  useEffect(() => { setQueryInput(q); }, [q]);
  useEffect(() => {
    const id = setTimeout(() => {
      if (queryInput !== q) {
        navigate({ to: ".", search: (prev: { q: string }) => ({ ...prev, q: queryInput }), replace: true });
      }
    }, 150);
    return () => clearTimeout(id);
  }, [queryInput, q, navigate]);
  const qc = useQueryClient();
  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem("qr-ads-open-cats-v1") ?? "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("staff_referrals")
        .select("referral_code, full_name, active")
        .or(`staff_user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
        .maybeSingle();
      setStaff((data as StaffRow) ?? null);
      setLoading(false);
    })();
  }, [user]);

  const context = useMemo(() => {
    if (!staff) return null;
    const origin = siteOrigin();
    return {
      name: staff.full_name,
      firstName: staff.full_name.split(" ")[0] || staff.full_name,
      code: staff.referral_code,
      link: `${origin}/r/${staff.referral_code}`,
    };
  }, [staff]);

  const layoutsFn = useServerFn(listQrAdLayouts);
  const { data: layouts } = useQuery({
    queryKey: ["qr-ad-layouts"],
    queryFn: () => layoutsFn(),
    enabled: !!user && !!staff,
  });

  const customFn = useServerFn(listQrAdTemplates);
  const { data: customData, refetch: refetchCustom } = useQuery({
    queryKey: ["qr-ad-templates"],
    queryFn: () => customFn(),
    enabled: !!user,
  });
  const { data: signedCustoms } = useSignedCustomTemplates(customData?.templates);

  // Pre-warm the shared QR + base-image caches so individual cards mount instantly.
  useEffect(() => {
    if (!context) return;
    prewarmQr(context.link);
    const urls = new Set<string>();
    for (const t of TEMPLATES) {
      if (t.kind === "image" && t.imageUrl) urls.add(t.imageUrl);
    }
    for (const r of signedCustoms ?? customData?.templates ?? []) {
      if (r.image_url) urls.add(r.image_url);
    }
    urls.forEach(prewarmBase);
  }, [context, signedCustoms, customData?.templates]);

  const deleteFn = useServerFn(deleteQrAdTemplate);
  const hideFn = useServerFn(setBuiltinHidden);

  async function deleteCustom(id: string, label: string) {
    if (!confirm(`Delete template "${label}"? This cannot be undone.`)) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["qr-ad-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  }

  async function deleteBuiltin(templateId: string, label: string) {
    if (!confirm(`Delete template "${label}"? It will be hidden from staff and moved to history.`)) return;
    try {
      await hideFn({ data: { templateId, hidden: true } });
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["qr-ad-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function restoreBuiltin(templateId: string) {
    try {
      await hideFn({ data: { templateId, hidden: false } });
      toast.success("Template restored");
      qc.invalidateQueries({ queryKey: ["qr-ad-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  if (authLoading || loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading your QR ads…</div>;
  }

  if (!staff) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-bold">No referral code yet</h1>
        <p className="mt-2 text-muted-foreground">
          Your account doesn't have a personal referral code, so we can't build personalized ads
          yet. Ask an admin to create one tied to your 365 email.
        </p>
        <Link to="/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  const hiddenBuiltins = new Set(customData?.hiddenBuiltins ?? []);
  const builtinOverrides = new Map<string, BuiltinCategoryRow>(
    (customData?.builtinCategories ?? []).map((r) => [r.template_id, r]),
  );
  const signedRows: CustomTemplateRow[] = signedCustoms ?? customData?.templates ?? [];
  const customTemplates = signedRows.map(customToTemplate);
  const customById = new Map<string, CustomTemplateRow>(
    signedRows.map((r) => [`custom:${r.id}`, r]),
  );
  // Active grid: never show hidden built-ins (history is gated behind admin toggle below)
  const activeBuiltins = TEMPLATES.map((t) => {
    const override = builtinOverrides.get(t.id);
    if (!override) return t;
    return {
      ...t,
      category: override.category ?? t.category,
      subcategory: override.subcategory ?? t.subcategory,
    };
  });
  const historyBuiltins = TEMPLATES.filter((t) => hiddenBuiltins.has(t.id));
  const allTemplatesUnfiltered: ShareTemplate[] = [...customTemplates, ...activeBuiltins];
  const allTemplates: ShareTemplate[] = q
    ? allTemplatesUnfiltered.filter((t) => matchesQuery(t, q))
    : allTemplatesUnfiltered;

  type GroupedSub = { subKey: string; subLabel: string; items: ShareTemplate[] };
  type Grouped = { catKey: string; catLabel: string; subs: GroupedSub[]; total: number };

  const groupedMap = new Map<string, Map<string, ShareTemplate[]>>();
  for (const t of allTemplates) {
    const catKey = t.category ?? UNCATEGORIZED_KEY;
    const subKey = t.subcategory ?? UNCATEGORIZED_KEY;
    if (!groupedMap.has(catKey)) groupedMap.set(catKey, new Map());
    const subMap = groupedMap.get(catKey)!;
    if (!subMap.has(subKey)) subMap.set(subKey, []);
    subMap.get(subKey)!.push(t);
  }
  const orderedCatKeys: string[] = [...CATEGORY_TREE.map((c) => c.key as string), UNCATEGORIZED_KEY];
  const grouped: Grouped[] = orderedCatKeys
    .filter((k) => groupedMap.has(k))
    .map((catKey) => {
      const subMap = groupedMap.get(catKey)!;
      const cat = CATEGORY_TREE.find((c) => c.key === catKey);
      const orderedSubKeys = cat
        ? [...cat.subs.map((s) => s.key as string), UNCATEGORIZED_KEY]
        : [UNCATEGORIZED_KEY];
      const subs: GroupedSub[] = orderedSubKeys
        .filter((k) => subMap.has(k))
        .map((subKey) => ({
          subKey,
          subLabel: subKey === UNCATEGORIZED_KEY ? "Uncategorized" : subcategoryLabel(subKey),
          items: subMap.get(subKey)!,
        }));
      const total = subs.reduce((acc, s) => acc + s.items.length, 0);
      return {
        catKey,
        catLabel: catKey === UNCATEGORIZED_KEY ? "Uncategorized" : categoryLabel(catKey as CategoryKey),
        subs,
        total,
      };
    });


  const toggleCat = (cat: string, v: boolean) => {
    setOpenCats((prev) => {
      const next = { ...prev, [cat]: v };
      try {
        localStorage.setItem("qr-ads-open-cats-v1", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            365 QR Advertisements
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold">
            {staff.full_name}'s personalized ads
          </h1>
          <p className="text-sm text-muted-foreground">
            Every design below has your QR code baked in. Download, print, or share — every scan
            and signup is credited to you for 90 days.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            staff.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {staff.active ? "Active" : "Inactive"}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to="/my-qr">
          <Button variant="outline" size="sm">My QR</Button>
        </Link>
        <Link to="/dashboard/referral">
          <Button variant="outline" size="sm">Referral dashboard</Button>
        </Link>
        <Link to="/r/$code/poster" params={{ code: staff.referral_code }}>
          <Button variant="outline" size="sm">Classic A4 poster</Button>
        </Link>
        {isAdmin && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHistory((v) => !v)}
              className="ml-auto"
            >
              <History className="mr-1 h-4 w-4" />
              {showHistory ? "Hide history" : `History (${historyBuiltins.length})`}
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Upload new template
            </Button>
          </>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Search your QR ads…"
          className="h-9 pl-8 pr-8"
        />
        {queryInput && (
          <button
            type="button"
            onClick={() => setQueryInput("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {q && (
          <p className="mt-1 text-xs text-muted-foreground">
            {allTemplates.length} of {allTemplatesUnfiltered.length} ads match "{q}"
          </p>
        )}
      </div>

      {context && (
        <div className="space-y-2">
          {grouped.map((cat, idx) => {
            const isOpen = openCats[cat.catKey] ?? true;
            return (
              <Collapsible
                key={cat.catKey}
                open={isOpen}
                onOpenChange={(v) => toggleCat(cat.catKey, v)}
                className="rounded-lg border border-border bg-card/40"
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40">
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                    {(() => {
                      const { icon: Icon, tone } = categoryVisual(cat.catKey);
                      return (
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone}`} aria-hidden>
                          <Icon className="h-4 w-4" />
                        </span>
                      );
                    })()}
                    <span className="text-sm font-semibold">{cat.catLabel}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {cat.total}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 p-3 pt-1">
                    {cat.subs.map((sub) => (
                      <div key={sub.subKey} className="space-y-2">
                        {(cat.subs.length > 1 || sub.subKey !== UNCATEGORIZED_KEY) && (
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {sub.subLabel}
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{sub.items.length}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          {sub.items.map((t) => {
                            const custom = customById.get(t.id);
                            return (
                              <div key={t.id} className="relative">
                                <TemplateCard
                                  template={t}
                                  context={context}
                                  override={layouts?.[t.id]}
                                />
                                {isAdmin && (
                                  <div className="mt-1 flex justify-end">
                                    {custom ? (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        title="Delete"
                                        onClick={() => deleteCustom(custom.id, custom.label)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        title="Archive"
                                        onClick={() => deleteBuiltin(t.id, t.label)}
                                      >
                                        <EyeOff className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}


      {isAdmin && showHistory && context && (
        <section className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Archived templates</h2>
              <p className="text-xs text-muted-foreground">
                Hidden from staff. Restore to make them available again.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{historyBuiltins.length} archived</span>
          </div>
          {historyBuiltins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing in history yet.</p>
          ) : (
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(96px,1fr))]">
              {historyBuiltins.map((t) => (
                <div key={t.id} className="relative mx-auto w-full max-w-[120px] opacity-80">
                  <TemplateCard template={t} context={context} override={layouts?.[t.id]} />
                  <div className="mt-1 flex justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      title="Restore"
                      onClick={() => restoreBuiltin(t.id)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Tip: when posting on Facebook or Messenger, attach the downloaded image AND paste your
        link — the QR in the image makes it scannable in-person, and the link keeps mobile taps
        tracked.
      </p>

      {isAdmin && (
        <QrAdTemplateUpload
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onSaved={() => refetchCustom()}
        />
      )}
    </div>
  );
}
