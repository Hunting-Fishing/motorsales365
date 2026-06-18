import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff, Plus, Trash2, History } from "lucide-react";
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
  type CustomTemplateRow,
} from "@/lib/share-kit-templates.functions";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/dashboard/share-kit")({
  component: ShareKitPage,
  head: () => ({
    meta: [
      { title: "Your Share Kit — 365 Motor Sales" },
      {
        name: "description",
        content:
          "Download and share branded 365 Motor Sales ads with your personal referral QR code baked in.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

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
      platePadding: 0.08,
      plateRadius: 0.12,
    },
    shareText: row.share_text,
  };
}

function ShareKitPage() {
  const { user, realIsAdmin, loading: authLoading } = useAuth();
  const isAdmin = realIsAdmin;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [staff, setStaff] = useState<StaffRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  async function deleteBuiltin(templateId: string, label: string) {
    if (!confirm(`Delete template "${label}"? It will be hidden from staff and moved to history.`)) return;
    try {
      await hideFn({ data: { templateId, hidden: true } });
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["share-kit-custom-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function restoreBuiltin(templateId: string) {
    try {
      await hideFn({ data: { templateId, hidden: false } });
      toast.success("Template restored");
      qc.invalidateQueries({ queryKey: ["share-kit-custom-templates"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
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
        <Link to="/dashboard" className="mt-4 inline-block">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      </div>
    );
  }

  const hiddenBuiltins = new Set(customData?.hiddenBuiltins ?? []);
  const signedRows: CustomTemplateRow[] = signedCustoms ?? customData?.templates ?? [];
  const customTemplates = signedRows.map(customToTemplate);
  const customById = new Map<string, CustomTemplateRow>(
    signedRows.map((r) => [`custom:${r.id}`, r]),
  );
  // Active grid: never show hidden built-ins (history is gated behind admin toggle below)
  const activeBuiltins = TEMPLATES.filter((t) => !hiddenBuiltins.has(t.id));
  const historyBuiltins = TEMPLATES.filter((t) => hiddenBuiltins.has(t.id));
  const allTemplates: ShareTemplate[] = [...customTemplates, ...activeBuiltins];

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

      {context && (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
          {allTemplates.map((t) => {
            const custom = customById.get(t.id);
            return (
              <div key={t.id} className="relative mx-auto w-full max-w-[240px]">
                <TemplateCard
                  template={t}
                  context={context}
                  override={layouts?.[t.id]}
                />
                {isAdmin && (
                  <div className="mt-2 flex justify-end">
                    {custom ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCustom(custom.id, custom.label)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteBuiltin(t.id, t.label)}
                      >
                        <EyeOff className="mr-1 h-3.5 w-3.5" /> Archive
                      </Button>
                    )}
                  </div>
                )}
              </div>
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
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
              {historyBuiltins.map((t) => (
                <div key={t.id} className="relative mx-auto w-full max-w-[240px] opacity-80">
                  <TemplateCard template={t} context={context} override={layouts?.[t.id]} />
                  <div className="mt-2 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => restoreBuiltin(t.id)}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Restore
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
        <ShareKitTemplateUpload
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onSaved={() => refetchCustom()}
        />
      )}
    </div>
  );
}
