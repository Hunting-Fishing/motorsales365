import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, Trash2, Wand2, Loader2, Crosshair } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TemplateCard } from "@/components/share-kit/template-card";
import { ShareKitTemplateUpload } from "@/components/share-kit/template-upload-dialog";
import { useSignedCustomTemplates } from "@/components/share-kit/use-signed-custom-templates";
import { TEMPLATES } from "@/lib/share-kit/templates";
import type { ShareTemplate } from "@/lib/share-kit/types";
import { listShareKitLayouts } from "@/lib/share-kit-layouts.functions";
import {
  listShareKitCustomTemplates,
  deleteShareKitCustomTemplate,
  setBuiltinHidden,
  updateShareKitTemplateQrPlacement,
  type CustomTemplateRow,
} from "@/lib/share-kit-templates.functions";
import { detectQrSlotFromUrl, isDetected } from "@/lib/share-kit/detect-qr-slot";
import { assessQrReadability } from "@/lib/share-kit/qr-readability";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/admin/advertisements/share-kit")({
  component: AdminShareKitPage,
  head: () => ({
    meta: [
      { title: "My QR / Share Kit — Advertisements" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

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
  };
}

function AdminShareKitPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [autoFittingId, setAutoFittingId] = useState<string | null>(null);
  const [bulkFitting, setBulkFitting] = useState(false);
  const [applyingAllId, setApplyingAllId] = useState<string | null>(null);


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

  const layoutsFn = useServerFn(listShareKitLayouts);
  const { data: layouts } = useQuery({
    queryKey: ["share-kit-layouts"],
    queryFn: () => layoutsFn(),
    enabled: !!user && !!staff,
  });

  const customFn = useServerFn(listShareKitCustomTemplates);
  const { data: customData, refetch: refetchCustom } = useQuery({
    queryKey: ["share-kit-custom-templates"],
    queryFn: () => customFn(),
    enabled: !!user,
  });
  const { data: signedCustoms } = useSignedCustomTemplates(customData?.templates);


  const deleteFn = useServerFn(deleteShareKitCustomTemplate);
  const hideFn = useServerFn(setBuiltinHidden);
  const updateQrFn = useServerFn(updateShareKitTemplateQrPlacement);

  async function deleteCustom(id: string, label: string) {
    if (!confirm(`Delete template "${label}"? This cannot be undone.`)) return;
    try {
      await deleteFn({ data: { id } });
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["share-kit-custom-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  }

  async function toggleBuiltinHidden(templateId: string, currentlyHidden: boolean) {
    try {
      await hideFn({ data: { templateId, hidden: !currentlyHidden } });
      toast.success(currentlyHidden ? "Template restored" : "Template hidden");
      qc.invalidateQueries({ queryKey: ["share-kit-custom-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  // Run detector against the signed image and persist new QR placement.
  // Returns { placed, readable } so callers can warn on low-readability
  // results even when placement succeeds.
  async function autoFitOne(
    row: CustomTemplateRow,
  ): Promise<{ placed: boolean; readable: boolean; reasons: string[] }> {
    const slot = await detectQrSlotFromUrl(row.image_url);
    if (!isDetected(slot)) return { placed: false, readable: false, reasons: [] };
    await updateQrFn({
      data: { id: row.id, qr_cx: slot.cx, qr_cy: slot.cy, qr_size: slot.size },
    });
    const report = await assessQrReadability({
      link: "https://365motorsales.com/r/ABCDEFGH",
      template: {
        width: row.width,
        height: row.height,
        qr: { cx: slot.cx, cy: slot.cy, size: slot.size, platePadding: 0 },
        background: "#ffffff",
        imageUrl: row.image_url,
      },
      placement: { cx: slot.cx, cy: slot.cy, size: slot.size },
    }).catch(() => null);
    return {
      placed: true,
      readable: report?.ok ?? true,
      reasons: report?.reasons ?? [],
    };
  }

  async function autoFitCard(row: CustomTemplateRow) {
    setAutoFittingId(row.id);
    try {
      const res = await autoFitOne(row);
      if (res.placed && res.readable) {
        toast.success(`Auto-fit QR for "${row.label}"`);
      } else if (res.placed && !res.readable) {
        toast.warning(
          `Placed QR on "${row.label}", but readability is low: ${res.reasons.join(" ")}`,
        );
      } else {
        toast.warning(
          `Could not find a white QR panel in "${row.label}". Use Edit layout to place it manually.`,
        );
      }
      qc.invalidateQueries({ queryKey: ["share-kit-custom-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Auto-fit failed");
    } finally {
      setAutoFittingId(null);
    }
  }

  async function autoFitAll(rows: CustomTemplateRow[]) {
    if (rows.length === 0) return;
    if (
      !confirm(
        `Auto-fit QR on all ${rows.length} custom templates? This may overwrite manual adjustments.`,
      )
    )
      return;
    setBulkFitting(true);
    const concurrency = 4;
    let detected = 0;
    let unreadable = 0;
    let skipped = 0;
    let failed = 0;
    const t = toast.loading(`Auto-fitting 0 / ${rows.length}…`);
    let processed = 0;
    let cursor = 0;

    async function worker() {
      while (cursor < rows.length) {
        const idx = cursor++;
        const row = rows[idx];
        try {
          const res = await autoFitOne(row);
          if (res.placed) {
            detected++;
            if (!res.readable) unreadable++;
          } else {
            skipped++;
          }
        } catch {
          failed++;
        }
        processed++;
        toast.loading(`Auto-fitting ${processed} / ${rows.length}…`, { id: t });
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, rows.length) }, () => worker()),
    );
    toast.dismiss(t);
    toast.success(
      `Auto-fit done — ${detected} placed (${unreadable} low-readability), ${skipped} no panel, ${failed} failed`,
    );
    qc.invalidateQueries({ queryKey: ["share-kit-custom-templates"] });
    setBulkFitting(false);
  }


  if (authLoading || loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading your share kit…</div>;
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
  const signedRows: CustomTemplateRow[] = signedCustoms ?? customData?.templates ?? [];
  const customTemplates = signedRows.map(customToTemplate);
  const customById = new Map<string, CustomTemplateRow>(signedRows.map((r) => [`custom:${r.id}`, r]));
  const visibleBuiltins = TEMPLATES.filter((t) => isAdmin || !hiddenBuiltins.has(t.id));
  const allTemplates: ShareTemplate[] = [...customTemplates, ...visibleBuiltins];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            365 Member Share Kit
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
              onClick={() => autoFitAll(signedRows)}
              disabled={bulkFitting || signedRows.length === 0}
              className="ml-auto"
              title="Run auto-detection on every custom template"
            >
              {bulkFitting ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-1 h-4 w-4" />
              )}
              Auto-fit QR on all
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Upload new template
            </Button>
          </>
        )}
      </div>

      {context && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {allTemplates.map((t) => {
            const custom = customById.get(t.id);
            const isBuiltin = !custom;
            const builtinHidden = isBuiltin && hiddenBuiltins.has(t.id);
            return (
              <div key={t.id} className="relative">
                {builtinHidden && (
                  <div className="absolute inset-0 z-10 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs font-semibold text-muted-foreground pointer-events-none">
                    Hidden from staff
                  </div>
                )}
                <TemplateCard
                  template={t}
                  context={context}
                  override={layouts?.[t.id]}
                />
                {isAdmin && (
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {custom ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => autoFitCard(custom)}
                          disabled={autoFittingId === custom.id || bulkFitting}
                          title="Detect the white SCAN HERE panel and snap the QR into it"
                        >
                          {autoFittingId === custom.id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <Wand2 className="mr-1 h-4 w-4" />
                          )}
                          Auto-fit QR
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCustom(custom.id, custom.label)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Delete
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBuiltinHidden(t.id, builtinHidden)}
                      >
                        {builtinHidden ? (
                          <><Eye className="mr-1 h-4 w-4" /> Show to staff</>
                        ) : (
                          <><EyeOff className="mr-1 h-4 w-4" /> Hide from staff</>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </div>
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
        <ShareKitTemplateUpload
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onSaved={() => refetchCustom()}
        />
      )}
    </div>
  );
}
