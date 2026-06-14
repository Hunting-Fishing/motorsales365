/**
 * SYNC GROUP: vehicle-passport
 * VERSION: 5
 *
 * Seller-facing form to submit OR/CR + inspection details for Vehicle Passport verification.
 * Status badge + form combined; safe re-renders on success.
 */
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck, Upload, X, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  submitPassportVerification,
  getMyPassportVerification,
} from "@/lib/passport.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const PH_PLATE = /^[A-Z]{2,3}[\s-]?\d{3,4}$/i;

const schema = z.object({
  or_number: z.string().trim().min(3, "OR number must be at least 3 characters").max(40),
  cr_number: z.string().trim().min(3, "CR number must be at least 3 characters").max(40),
  chassis_number: z.string().trim().min(6, "Chassis number must be at least 6 characters").max(40),
  engine_number: z.string().trim().min(3, "Engine number required").max(40),
  plate_number: z
    .string()
    .trim()
    .min(3)
    .max(15)
    .refine((v) => PH_PLATE.test(v), "Use a PH plate format e.g. ABC 1234"),
  inspection_date: z.string().optional(),
  inspection_provider: z.string().trim().max(120).optional(),
  inspection_notes: z.string().trim().max(1000).optional(),
  accident_disclosure: z.boolean(),
  flood_disclosure: z.boolean(),
});
type Form = z.infer<typeof schema>;

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending review", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  more_info: {
    label: "More info needed",
    cls: "bg-orange-500/15 text-orange-700 border-orange-500/30",
  },
  approved: { label: "Verified", cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  rejected: { label: "Rejected", cls: "bg-rose-500/15 text-rose-700 border-rose-500/30" },
};

export function PassportVerificationSection({ vehicleId }: { vehicleId: string }) {
  const { user } = useAuth();
  const getMine = useServerFn(getMyPassportVerification);
  const submit = useServerFn(submitPassportVerification);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["passport-verification", vehicleId],
    queryFn: () => getMine({ data: { vehicle_id: vehicleId } }),
  });
  const existing = data?.verification ?? null;

  const [form, setForm] = useState<Form>({
    or_number: "",
    cr_number: "",
    chassis_number: "",
    engine_number: "",
    plate_number: "",
    inspection_date: "",
    inspection_provider: "",
    inspection_notes: "",
    accident_disclosure: false,
    flood_disclosure: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [docPaths, setDocPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      or_number: existing.or_number ?? "",
      cr_number: existing.cr_number ?? "",
      chassis_number: existing.chassis_number ?? "",
      engine_number: existing.engine_number ?? "",
      plate_number: existing.plate_number ?? "",
      inspection_date: existing.inspection_date ?? "",
      inspection_provider: existing.inspection_provider ?? "",
      inspection_notes: existing.inspection_notes ?? "",
      accident_disclosure: !!existing.accident_disclosure,
      flood_disclosure: !!existing.flood_disclosure,
    });
    setDocPaths(existing.document_urls ?? []);
  }, [existing]);

  const locked = existing?.status === "approved" || existing?.status === "rejected";

  const handleUpload = async (file: File | undefined) => {
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File must be under 8 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${vehicleId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("vehicle-passport-docs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setDocPaths((p) => [...p, path]);
      toast.success("Document uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (path: string) => {
    try {
      await supabase.storage.from("vehicle-passport-docs").remove([path]);
    } catch {
      /* ignore */
    }
    setDocPaths((p) => p.filter((x) => x !== path));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof Form, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof Form;
        if (k && !errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (docPaths.length === 0) {
      toast.error("Upload at least one OR/CR document");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await submit({
        data: {
          vehicle_id: vehicleId,
          ...parsed.data,
          inspection_date: parsed.data.inspection_date || null,
          inspection_provider: parsed.data.inspection_provider || null,
          inspection_notes: parsed.data.inspection_notes || null,
          document_urls: docPaths,
        },
      });
      toast.success("Submitted for verification");
      await refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Passport verification</h3>
        </div>
        {existing && (
          <Badge variant="outline" className={STATUS_LABEL[existing.status]?.cls}>
            {STATUS_LABEL[existing.status]?.label ?? existing.status}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Submit OR/CR and inspection details. Our team reviews within 1–3 business days. Sensitive
        fields are never shown publicly — buyers only see status, inspection date, and disclosure
        flags.
      </p>

      {existing?.status === "more_info" && existing.review_notes && (
        <Alert className="mt-3 border-orange-500/40 bg-orange-500/10">
          <AlertDescription className="text-xs">
            <strong>Reviewer note:</strong> {existing.review_notes}
          </AlertDescription>
        </Alert>
      )}
      {existing?.status === "rejected" && existing.review_notes && (
        <Alert className="mt-3 border-rose-500/40 bg-rose-500/10">
          <AlertDescription className="text-xs">
            <strong>Rejected:</strong> {existing.review_notes}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="mt-4 flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <fieldset disabled={locked || saving} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="OR number" error={errors.or_number}>
                <Input
                  value={form.or_number}
                  onChange={(e) => setForm({ ...form, or_number: e.target.value })}
                  placeholder="e.g. 1234567"
                />
              </Field>
              <Field label="CR number" error={errors.cr_number}>
                <Input
                  value={form.cr_number}
                  onChange={(e) => setForm({ ...form, cr_number: e.target.value })}
                  placeholder="e.g. 7654321"
                />
              </Field>
              <Field label="Chassis / VIN" error={errors.chassis_number}>
                <Input
                  value={form.chassis_number}
                  onChange={(e) =>
                    setForm({ ...form, chassis_number: e.target.value.toUpperCase() })
                  }
                />
              </Field>
              <Field label="Engine number" error={errors.engine_number}>
                <Input
                  value={form.engine_number}
                  onChange={(e) =>
                    setForm({ ...form, engine_number: e.target.value.toUpperCase() })
                  }
                />
              </Field>
              <Field label="Plate number" error={errors.plate_number}>
                <Input
                  value={form.plate_number}
                  onChange={(e) =>
                    setForm({ ...form, plate_number: e.target.value.toUpperCase() })
                  }
                  placeholder="ABC 1234"
                />
              </Field>
              <Field label="Inspection date" error={errors.inspection_date}>
                <Input
                  type="date"
                  value={form.inspection_date}
                  onChange={(e) => setForm({ ...form, inspection_date: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Inspection provider" error={errors.inspection_provider}>
              <Input
                value={form.inspection_provider}
                onChange={(e) => setForm({ ...form, inspection_provider: e.target.value })}
                placeholder="Shop / inspector name"
              />
            </Field>

            <Field label="Inspection notes (optional)" error={errors.inspection_notes}>
              <Textarea
                value={form.inspection_notes}
                onChange={(e) => setForm({ ...form, inspection_notes: e.target.value })}
                rows={3}
                maxLength={1000}
                placeholder="Any findings, condition notes, etc."
              />
            </Field>

            <div className="grid gap-3 rounded-md border border-border/60 bg-muted/30 p-3 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Has prior accident damage</span>
                <Switch
                  checked={form.accident_disclosure}
                  onCheckedChange={(v) => setForm({ ...form, accident_disclosure: v })}
                />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Has prior flood damage</span>
                <Switch
                  checked={form.flood_disclosure}
                  onCheckedChange={(v) => setForm({ ...form, flood_disclosure: v })}
                />
              </label>
            </div>

            <div>
              <Label>OR/CR & inspection documents</Label>
              <p className="text-xs text-muted-foreground">
                PDF or image, max 8 MB each. Private — only you and our reviewers can access.
              </p>
              <div className="mt-2 space-y-2">
                {docPaths.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-xs"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{p.split("/").pop()}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeDoc(p)}
                      aria-label="Remove document"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    hidden
                    onChange={(e) => {
                      handleUpload(e.target.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button asChild type="button" variant="outline" disabled={uploading}>
                    <span>
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading…" : "Add document"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </fieldset>

          {locked ? (
            <p className="text-xs text-muted-foreground">
              This submission is {existing?.status}. Contact support to make changes.
            </p>
          ) : (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || uploading}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : existing ? (
                  "Update & resubmit"
                ) : (
                  "Submit for verification"
                )}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block text-sm">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
