import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordClaimEvidence } from "@/lib/business-claims.functions";
import { useAuth } from "@/hooks/use-auth";

export const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  facebook_ownership: "Facebook ownership screenshot",
  google_business: "Google Business screenshot",
  business_license: "Business license / permit",
  utility_bill: "Utility bill",
  id_document: "Government-issued ID",
  website_proof: "Website ownership proof",
  other: "Other supporting document",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export function EvidenceUploader({
  claimId,
  businessId,
}: {
  claimId: string;
  businessId: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const record = useServerFn(recordClaimEvidence);
  const fileRef = useRef<HTMLInputElement>(null);
  const [evidenceType, setEvidenceType] = useState<string>("facebook_ownership");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_SIZE) {
      toast.error("File is too large (max 10 MB).");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
      const path = `${user.id}/${claimId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("claim-evidence")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw new Error(upErr.message);

      await record({
        data: {
          claimId,
          evidenceType: evidenceType as
            | "facebook_ownership"
            | "google_business"
            | "business_license"
            | "utility_bill"
            | "id_document"
            | "website_proof"
            | "other",
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          storagePath: path,
        },
      });

      toast.success("Evidence uploaded.");
      queryClient.invalidateQueries({ queryKey: ["my-claim-history", businessId] });
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Add evidence
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={evidenceType} onValueChange={setEvidenceType}>
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
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Choose file"}
          </Button>
        </div>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        PNG, JPG or PDF up to 10 MB. Screenshots are accepted (e.g. Facebook
        Page Settings → Page Roles showing you as admin).
      </p>
    </div>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
