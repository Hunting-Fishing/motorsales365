import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Upload, CheckCircle2, Clock, XCircle, AlertCircle, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { LocationPicker } from "@/components/location-picker";

export const Route = createFileRoute("/dashboard/verification")({
  component: VerificationPage,
});

const BUSINESS_KINDS = [
  { value: "repair_shop", label: "Repair shop" },
  { value: "insurance", label: "Insurance provider / agency" },
  { value: "dealer", label: "Dealership / car lot" },
  { value: "other", label: "Other business" },
];

const formSchema = z.object({
  business_kind: z.enum(["repair_shop", "insurance", "dealer", "other"]),
  legal_name: z.string().trim().min(2, "Legal business name is required").max(200),
  dti_sec_registration: z.string().trim().max(100).optional().or(z.literal("")),
  tax_id: z.string().trim().max(100).optional().or(z.literal("")),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
  contact_email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  barangay: z.string().trim().max(100).optional().or(z.literal("")),
});

type DocItem = { path: string; name: string };

function VerificationPage() {
  const { user } = useAuth();
  const [request, setRequest] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    business_kind: "repair_shop" as "repair_shop" | "insurance" | "dealer" | "other",
    legal_name: "",
    dti_sec_registration: "",
    tax_id: "",
    contact_phone: "",
    contact_email: "",
    address: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
  });
  const [docs, setDocs] = useState<DocItem[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: req }, { data: prof }] = await Promise.all([
      supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);
    setRequest(req);
    setProfile(prof);
    if (req) {
      setForm({
        business_kind: (["repair_shop", "insurance", "dealer", "other"].includes(req.business_kind as string)
          ? (req.business_kind as "repair_shop" | "insurance" | "dealer" | "other")
          : "other"),
        legal_name: req.legal_name ?? "",
        dti_sec_registration: req.dti_sec_registration ?? "",
        tax_id: req.tax_id ?? "",
        contact_phone: req.contact_phone ?? "",
        contact_email: req.contact_email ?? "",
        address: req.address ?? "",
        region: req.region ?? "",
        province: req.province ?? "",
        city: req.city ?? "",
        barangay: req.barangay ?? "",
      });
      setDocs(((req.documents as DocItem[]) ?? []) as DocItem[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const uploadDoc = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("verification-docs").upload(path, file);
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    setDocs((d) => [...d, { path, name: file.name }]);
    toast.success("Document uploaded");
  };

  const removeDoc = async (idx: number) => {
    const item = docs[idx];
    await supabase.storage.from("verification-docs").remove([item.path]);
    setDocs((d) => d.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!user) return;
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }
    if (docs.length === 0) {
      toast.error("Upload at least one supporting document");
      return;
    }
    if (
      ["repair_shop", "insurance", "dealer"].includes(form.business_kind) &&
      !form.dti_sec_registration.trim()
    ) {
      toast.error("DTI/SEC registration number is required for this business type");
      return;
    }

    setSubmitting(true);
    const payload = {
      user_id: user.id,
      business_kind: form.business_kind,
      legal_name: form.legal_name.trim(),
      dti_sec_registration: form.dti_sec_registration.trim() || null,
      tax_id: form.tax_id.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_email: form.contact_email.trim() || null,
      address: form.address.trim() || null,
      region: form.region || null,
      province: form.province || null,
      city: form.city.trim() || null,
      barangay: form.barangay.trim() || null,
      documents: docs,
      status: "pending" as const,
      submitted_at: new Date().toISOString(),
    };

    let error;
    if (request && (request.status === "more_info" || request.status === "rejected")) {
      ({ error } = await supabase
        .from("verification_requests")
        .update(payload)
        .eq("id", request.id));
    } else if (request && request.status === "pending") {
      ({ error } = await supabase
        .from("verification_requests")
        .update(payload)
        .eq("id", request.id));
    } else {
      ({ error } = await supabase.from("verification_requests").insert(payload));
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Verification submitted — we'll review within 1–2 business days.");
    load();
  };

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  const status = profile?.verification_status ?? "unverified";
  const canEdit = !request || ["rejected", "more_info"].includes(request.status);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 font-display text-2xl font-bold">Business verification</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Repair shops, insurance providers, and dealerships can earn a Verified badge that appears
        next to their listings and seller profile.
      </p>

      <StatusCard status={status} request={request} />

      {request && request.status === "more_info" && request.review_notes && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950/40">
          <div className="mb-1 flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4" /> Reviewer requested more info
          </div>
          <p className="text-amber-900/90 dark:text-amber-100/90">{request.review_notes}</p>
        </div>
      )}

      {request && request.status === "rejected" && request.review_notes && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="mb-1 flex items-center gap-2 font-semibold text-destructive">
            <XCircle className="h-4 w-4" /> Application rejected
          </div>
          <p>{request.review_notes}</p>
          <p className="mt-2 text-muted-foreground">You can update and resubmit below.</p>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <Label>Business type *</Label>
          <Select
            value={form.business_kind}
            onValueChange={(v: any) => setForm({ ...form, business_kind: v })}
            disabled={!canEdit}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUSINESS_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Legal business name *</Label>
          <Input
            value={form.legal_name}
            onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
            disabled={!canEdit}
            maxLength={200}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>DTI / SEC registration #</Label>
            <Input
              value={form.dti_sec_registration}
              onChange={(e) => setForm({ ...form, dti_sec_registration: e.target.value })}
              disabled={!canEdit}
              maxLength={100}
            />
          </div>
          <div>
            <Label>BIR / Tax ID (TIN)</Label>
            <Input
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              disabled={!canEdit}
              maxLength={100}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Contact phone</Label>
            <Input
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              disabled={!canEdit}
              maxLength={40}
            />
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              disabled={!canEdit}
              maxLength={255}
            />
          </div>
        </div>

        <div>
          <Label>Business address</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            disabled={!canEdit}
            maxLength={300}
          />
        </div>

        <div className={canEdit ? "" : "pointer-events-none opacity-60"}>
          <LocationPicker
            value={{
              region: form.region || null,
              province: form.province || null,
              city: form.city || null,
              barangay: form.barangay || null,
            }}
            onChange={(v) => setForm({
              ...form,
              region: v.region ?? "",
              province: v.province ?? "",
              city: v.city ?? "",
              barangay: v.barangay ?? "",
            })}
          />
        </div>

        <div>
          <Label className="mb-2 block">Supporting documents *</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            DTI/SEC certificate, BIR Form 2303, Mayor's permit, valid government ID. PDF or image, up to 10MB each.
          </p>
          <div className="space-y-2">
            {docs.map((d, i) => (
              <div key={d.path} className="flex items-center justify-between rounded-md border border-border bg-background p-2 text-sm">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.name}</span>
                </div>
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => removeDoc(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background p-4 text-sm hover:bg-secondary">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Upload document"}
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadDoc(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>

        {canEdit && (
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : request ? "Resubmit application" : "Submit for review"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusCard({ status, request }: { status: string; request: any }) {
  if (status === "verified") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <div className="font-semibold text-primary">Your business is verified</div>
          <div className="text-sm text-muted-foreground">
            Your Verified badge appears on all of your listings and on your seller profile.
          </div>
        </div>
      </div>
    );
  }
  if (status === "pending" || request?.status === "pending") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
        <Clock className="mt-0.5 h-5 w-5 text-amber-700 dark:text-amber-300" />
        <div>
          <div className="font-semibold text-amber-900 dark:text-amber-100">Under review</div>
          <div className="text-sm text-amber-900/80 dark:text-amber-100/80">
            Submitted {formatDate(request?.submitted_at)}. We typically respond within 1–2 business days.
          </div>
        </div>
        <Badge variant="secondary" className="ml-auto">Pending</Badge>
      </div>
    );
  }
  if (status === "rejected") {
    return null; // handled by reject banner below
  }
  return (
    <div className="mb-6 rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
      Submit your business credentials below to earn a Verified badge.
    </div>
  );
}
