import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, ShieldAlert, Upload, Paperclip, X } from "lucide-react";
import {
  submitOwnershipTransferRequest,
  recordClaimEvidence,
} from "@/lib/business-claims.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EVIDENCE_TYPE_LABELS } from "@/components/business-page/evidence-uploader";

type Method = "email" | "phone" | "document";
type EvidenceType =
  | "facebook_ownership"
  | "google_business"
  | "business_license"
  | "utility_bill"
  | "id_document"
  | "website_proof"
  | "other";

const MAX_SIZE = 10 * 1024 * 1024;

export function TransferRequestDialog({
  open,
  onOpenChange,
  businessId,
  businessName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  businessId: string;
  businessName: string;
}) {
  const submit = useServerFn(submitOwnershipTransferRequest);
  const record = useServerFn(recordClaimEvidence);
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<Method>("document");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("facebook_ownership");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMethod("document");
    setValue("");
    setReason("");
    setEvidenceType("facebook_ownership");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      toast.error("File is too large (max 10 MB).");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    if (reason.trim().length < 10) return;
    if (!file) {
      toast.error("Please attach a proof-of-ownership document.");
      return;
    }
    setBusy(true);
    try {
      const res = await submit({
        data: {
          businessId,
          reason,
          contactMethod: method,
          contactValue: method === "document" ? undefined : value || undefined,
        },
      });
      const claimId = res.id;

      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
      const path = `${user.id}/${claimId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("claim-evidence")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      await record({
        data: {
          claimId,
          evidenceType,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          storagePath: path,
        },
      });

      qc.invalidateQueries({ queryKey: ["my-claim-requests"] });
      qc.invalidateQueries({ queryKey: ["my-claim-history", businessId] });
      toast.success("Transfer request submitted for admin review.");
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Request ownership transfer — {businessName}
          </DialogTitle>
          <DialogDescription>
            This business is already claimed by another account. Submit proof that you are the
            rightful owner and our team will review the transfer manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              Transfers permanently reassign ownership. Provide clear evidence (business permit,
              BIR registration, Facebook/Google admin screenshot). The current owner will be
              notified.
            </div>
          </div>

          <div>
            <Label>Why should ownership transfer? *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="e.g. I am the registered owner, the previous account belonged to a former staff member who has left the business."
            />
            <div
              className={`mt-1 text-[10px] ${
                reason.trim().length > 0 && reason.trim().length < 10
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {reason.trim().length}/2000 — minimum 10 characters
              {reason.trim().length > 0 &&
                reason.trim().length < 10 &&
                ` (add ${10 - reason.trim().length} more to continue)`}
            </div>
          </div>

          <div>
            <Label>Preferred verification method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Business documents</SelectItem>
                <SelectItem value="email">Business email</SelectItem>
                <SelectItem value="phone">Business phone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(method === "email" || method === "phone") && (
            <div>
              <Label>{method === "email" ? "Business email" : "Business phone"}</Label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={method === "email" ? "owner@business.ph" : "09xx xxx xxxx"}
              />
            </div>
          )}

          <div className="rounded-md border border-border bg-background/60 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              Proof of ownership *
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={evidenceType}
                  onValueChange={(v) => setEvidenceType(v as EvidenceType)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  {file ? "Replace file" : "Choose file"}
                </Button>
              </div>
            </div>
            {file && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded border border-border bg-muted/40 px-2 py-1 text-xs">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              PNG, JPG or PDF up to 10 MB. Screenshots are accepted (e.g. Facebook Page Settings
              → Page Roles showing you as admin).
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={busy || reason.trim().length < 10 || !file}
            >
              {busy ? "Submitting…" : "Submit transfer request"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
