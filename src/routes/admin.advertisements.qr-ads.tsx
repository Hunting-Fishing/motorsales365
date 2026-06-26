import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, Eye, EyeOff, Plus, Trash2, Loader2, Sparkles, Tags, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TemplateCard } from "@/components/qr-ads/template-card";
import { QrAdTemplateUpload } from "@/components/qr-ads/template-upload-dialog";
import { useSignedCustomTemplates } from "@/components/qr-ads/use-signed-custom-templates";
import { CategoryPicker } from "@/components/qr-ads/category-picker";
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
import { listQrAdLayouts, upsertQrAdLayout } from "@/lib/qr-ad-layouts.functions";
import {
  listQrAdTemplates,
  deleteQrAdTemplate,
  setBuiltinHidden,
  updateQrAdTemplateQrPlacement,
  setQrAdTemplateCategory,
  setQrAdBuiltinCategory,
  type CustomTemplateRow,
  type BuiltinCategoryRow,
} from "@/lib/qr-ad-templates.functions";
import { detectQrSlotFromUrl, isDetected } from "@/lib/qr-ads/detect-qr-slot";
import { assessQrReadability } from "@/lib/qr-ads/qr-readability";
import { detectScanHereWithVision } from "@/lib/qr-ad-vision.functions";
import { classifyQrAdTemplate } from "@/lib/qr-ad-classify.functions";
import { siteOrigin } from "@/lib/site-config";

type SmartTarget =
  | { kind: "custom"; id: string; label: string; imageUrl: string; width: number; height: number }
  | { kind: "builtin-image"; id: string; label: string; imageUrl: string; width: number; height: number };

type ClassifyTarget =
  | { kind: "custom"; id: string; label: string; imageUrl: string }
  | { kind: "builtin"; id: string; label: string; imageUrl: string };

const adsSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/admin/advertisements/qr-ads")({
  validateSearch: zodValidator(adsSearchSchema),
  component: AdminQrAdsPage,
  head: () => ({
    meta: [
      { title: "QR Advertisements — Admin" },
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

type StaffRow = { referral_code: string; full_name: string; active: boolean };

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

function AdminQrAdsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
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
  const [autoFittingId, setAutoFittingId] = useState<string | null>(null);
  const [bulkFitting, setBulkFitting] = useState(false);
  const [bulkClassifying, setBulkClassifying] = useState(false);
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
        .from("staff_referrals_directory")
        .select("referral_code, full_name, active")
        .eq("staff_user_id", user.id)
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

  const deleteFn = useServerFn(deleteQrAdTemplate);
  const hideFn = useServerFn(setBuiltinHidden);
  const updateQrFn = useServerFn(updateQrAdTemplateQrPlacement);
  const visionFn = useServerFn(detectScanHereWithVision);
  const upsertLayoutFn = useServerFn(upsertQrAdLayout);
  const setCustomCatFn = useServerFn(setQrAdTemplateCategory);
  const setBuiltinCatFn = useServerFn(setQrAdBuiltinCategory);
  const classifyFn = useServerFn(classifyQrAdTemplate);

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

  async function toggleBuiltinHidden(templateId: string, currentlyHidden: boolean) {
    try {
      await hideFn({ data: { templateId, hidden: !currentlyHidden } });
      toast.success(currentlyHidden ? "Template restored" : "Template hidden");
      qc.invalidateQueries({ queryKey: ["qr-ad-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function saveCustomCategory(id: string, category: string | null, subcategory: string | null) {
    try {
      await setCustomCatFn({ data: { id, category, subcategory } });
      toast.success("Category updated");
      qc.invalidateQueries({ queryKey: ["qr-ad-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function saveBuiltinCategory(templateId: string, category: string | null, subcategory: string | null) {
    try {
      await setBuiltinCatFn({ data: { templateId, category, subcategory } });
      toast.success("Category updated");
      qc.invalidateQueries({ queryKey: ["qr-ad-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  // Smart fit: Gemini vision first, heuristic fallback (customs only), readability check.
  type SmartResult = {
    placed: boolean;
    source: "ai" | "heuristic" | "none";
    readable: boolean;
    reasons: string[];
    confidence: number;
  };

  function absoluteUrl(u: string): string {
    if (/^https?:\/\//i.test(u)) return u;
    const origin = siteOrigin().replace(/\/$/, "");
    return `${origin}${u.startsWith("/") ? "" : "/"}${u}`;
  }

  async function smartFitAny(target: SmartTarget): Promise<SmartResult> {
    const imageUrl = absoluteUrl(target.imageUrl);
    let cx = 0, cy = 0, size = 0;
    let source: SmartResult["source"] = "none";
    let confidence = 0;
    try {
      const ai = await visionFn({ data: { imageUrl, width: target.width, height: target.height } });
      if (ai.found && ai.confidence >= 0.55) {
        cx = ai.cx; cy = ai.cy; size = ai.size; confidence = ai.confidence; source = "ai";
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (/credits exhausted|LOVABLE_API_KEY/i.test(msg)) throw e;
    }
    if (source === "none" && target.kind === "custom") {
      const slot = await detectQrSlotFromUrl(imageUrl);
      if (isDetected(slot)) {
        cx = slot.cx; cy = slot.cy; size = slot.size; confidence = slot.confidence; source = "heuristic";
      }
    }
    if (source === "none") {
      return { placed: false, source: "none", readable: false, reasons: [], confidence: 0 };
    }
    if (target.kind === "custom") {
      await updateQrFn({ data: { id: target.id, qr_cx: cx, qr_cy: cy, qr_size: size } });
    } else {
      await upsertLayoutFn({ data: { templateId: target.id, cx, cy, size } });
    }
    const report = await assessQrReadability({
      link: "https://365motorsales.com/r/ABCDEFGH",
      template: {
        width: target.width,
        height: target.height,
        qr: { cx, cy, size, platePadding: 0 },
        background: "#ffffff",
        imageUrl,
      },
      placement: { cx, cy, size },
    }).catch(() => null);
    return {
      placed: true,
      source,
      readable: report?.ok ?? true,
      reasons: report?.reasons ?? [],
      confidence,
    };
  }

  async function smartFitAllAds(targets: SmartTarget[]) {
    if (targets.length === 0) return;
    setBulkFitting(true);
    const concurrency = 3;
    let aiPlaced = 0, heuristicPlaced = 0, unreadable = 0, skipped = 0, failed = 0;
    const t = toast.loading(`Smart-fitting 0 / ${targets.length}…`);
    let processed = 0;
    let cursor = 0;
    async function worker() {
      while (cursor < targets.length) {
        const idx = cursor++;
        const target = targets[idx];
        setAutoFittingId(target.id);
        try {
          const res = await smartFitAny(target);
          if (res.placed) {
            if (res.source === "ai") aiPlaced++; else heuristicPlaced++;
            if (!res.readable) unreadable++;
          } else { skipped++; }
        } catch (e: any) {
          failed++;
          const msg = String(e?.message ?? "");
          if (/credits exhausted|LOVABLE_API_KEY/i.test(msg)) { cursor = targets.length; toast.error(msg); }
        }
        processed++;
        toast.loading(
          `Smart-fitting ${processed} / ${targets.length} — ${aiPlaced} AI · ${heuristicPlaced} heuristic${unreadable ? ` · ${unreadable} review` : ""}`,
          { id: t },
        );
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
    toast.dismiss(t);
    setAutoFittingId(null);
    toast.success(`Smart fit done — ${aiPlaced} AI · ${heuristicPlaced} heuristic · ${unreadable} need review · ${skipped} no panel · ${failed} failed`);
    qc.invalidateQueries({ queryKey: ["qr-ad-templates"] });
    qc.invalidateQueries({ queryKey: ["qr-ad-layouts"] });
    setBulkFitting(false);
  }

  async function classifyAllUncategorized(targets: ClassifyTarget[]) {
    if (targets.length === 0) {
      toast.info("Everything is already categorized.");
      return;
    }
    setBulkClassifying(true);
    const concurrency = 3;
    let cursor = 0, processed = 0, ok = 0, failed = 0, skipped = 0;
    const t = toast.loading(`Categorizing 0 / ${targets.length}…`);
    async function worker() {
      while (cursor < targets.length) {
        const idx = cursor++;
        const target = targets[idx];
        try {
          const res = await classifyFn({ data: { imageUrl: absoluteUrl(target.imageUrl) } });
          if (res.subcategory && res.category) {
            if (target.kind === "custom") {
              await setCustomCatFn({ data: { id: target.id, category: res.category, subcategory: res.subcategory } });
            } else {
              await setBuiltinCatFn({ data: { templateId: target.id, category: res.category, subcategory: res.subcategory } });
            }
            ok++;
          } else { skipped++; }
        } catch (e: any) {
          failed++;
          const msg = String(e?.message ?? "");
          if (/credits exhausted/i.test(msg)) { cursor = targets.length; toast.error(msg); }
        }
        processed++;
        toast.loading(`Categorizing ${processed} / ${targets.length} — ${ok} tagged`, { id: t });
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
    toast.dismiss(t);
    toast.success(`Auto-categorize done — ${ok} tagged · ${skipped} unclear · ${failed} failed`);
    qc.invalidateQueries({ queryKey: ["qr-ad-templates"] });
    setBulkClassifying(false);
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
      </div>
    );
  }

  const hiddenBuiltins = new Set(customData?.hiddenBuiltins ?? []);
  const builtinOverrides = new Map<string, BuiltinCategoryRow>(
    (customData?.builtinCategories ?? []).map((r) => [r.template_id, r]),
  );
  const signedRows: CustomTemplateRow[] = signedCustoms ?? customData?.templates ?? [];
  const customTemplates = signedRows.map(customToTemplate);
  const customById = new Map<string, CustomTemplateRow>(signedRows.map((r) => [`custom:${r.id}`, r]));

  // Apply built-in overrides on top of code-defined categories
  const visibleBuiltins = TEMPLATES.map((t) => {
    const override = builtinOverrides.get(t.id);
    if (!override) return t;
    return {
      ...t,
      category: override.category ?? t.category,
      subcategory: override.subcategory ?? t.subcategory,
    };
  });
  const allTemplatesUnfiltered: ShareTemplate[] = [...customTemplates, ...visibleBuiltins];
  const allTemplates: ShareTemplate[] = q
    ? allTemplatesUnfiltered.filter((t) => matchesQuery(t, q))
    : allTemplatesUnfiltered;

  // Group by category -> subcategory
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
      try { localStorage.setItem("qr-ads-open-cats-v1", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const smartTargets: SmartTarget[] = [
    ...signedRows.map<SmartTarget>((r) => ({
      kind: "custom", id: r.id, label: r.label, imageUrl: r.image_url, width: r.width, height: r.height,
    })),
    ...visibleBuiltins
      .filter((t) => t.kind === "image" && !!t.imageUrl)
      .map<SmartTarget>((t) => ({
        kind: "builtin-image", id: t.id, label: t.label, imageUrl: t.imageUrl!,
        width: t.width, height: t.height,
      })),
  ];

  const classifyTargets: ClassifyTarget[] = [
    ...signedRows
      .filter((r) => !r.subcategory)
      .map<ClassifyTarget>((r) => ({ kind: "custom", id: r.id, label: r.label, imageUrl: r.image_url })),
    ...TEMPLATES.filter((t) => t.kind === "image" && !!t.imageUrl && !builtinOverrides.get(t.id)?.subcategory && !t.subcategory)
      .map<ClassifyTarget>((t) => ({ kind: "builtin", id: t.id, label: t.label, imageUrl: t.imageUrl! })),
  ];

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
              onClick={() => classifyAllUncategorized(classifyTargets)}
              disabled={bulkClassifying || classifyTargets.length === 0}
              className="ml-auto"
              title="Use AI vision to categorize every untagged ad"
            >
              {bulkClassifying ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Tags className="mr-1 h-4 w-4" />
              )}
              Auto-categorize ({classifyTargets.length})
            </Button>
            <Button
              size="sm"
              onClick={() => smartFitAllAds(smartTargets)}
              disabled={bulkFitting || smartTargets.length === 0}
              title="AI-detects the Scan Here panel on every flyer and snaps the QR into it"
            >
              {bulkFitting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              Smart fit all ads ({smartTargets.length})
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
          placeholder="Search ads by name, description, or category…"
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
          {grouped.map((cat) => {
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
                            const isBuiltin = !custom;
                            const builtinHidden = isBuiltin && hiddenBuiltins.has(t.id);
                            const overrideForBuiltin = isBuiltin ? builtinOverrides.get(t.id) : undefined;
                            const currentCat = custom ? custom.category : (overrideForBuiltin?.category ?? t.category ?? null);
                            const currentSub = custom ? custom.subcategory : (overrideForBuiltin?.subcategory ?? t.subcategory ?? null);
                            return (
                              <div key={t.id} className="relative">
                                {builtinHidden && (
                                  <div className="absolute inset-0 z-10 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs font-semibold text-muted-foreground pointer-events-none">
                                    Hidden from staff
                                  </div>
                                )}
                                <TemplateCard template={t} context={context} override={layouts?.[t.id]} />
                                {isAdmin && (
                                  <div className="mt-1 flex justify-end gap-1">
                                    <CategoryPicker
                                      category={currentCat ?? null}
                                      subcategory={currentSub ?? null}
                                      onChange={(c, s) =>
                                        custom
                                          ? saveCustomCategory(custom.id, c, s)
                                          : saveBuiltinCategory(t.id, c, s)
                                      }
                                      disabled={bulkFitting || bulkClassifying}
                                    />
                                    {custom ? (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        title="Delete"
                                        onClick={() => deleteCustom(custom.id, custom.label)}
                                        disabled={bulkFitting}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-6 w-6"
                                        title={builtinHidden ? "Show to staff" : "Hide from staff"}
                                        onClick={() => toggleBuiltinHidden(t.id, builtinHidden)}
                                      >
                                        {builtinHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
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
