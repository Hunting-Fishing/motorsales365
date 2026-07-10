import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  verifyListingDocuments,
  getListingVerification,
  deleteListingDocument,
  type FieldCheck,
} from "@/lib/listing-verification.functions";

const MAX_SIZE = 10 * 1024 * 1024;

const STATUS_LABEL: Record<string, { label: string; className: string; icon: typeof ShieldCheck }> = {
  unverified: { label: "Not verified", className: "text-muted-foreground", icon: ShieldCheck },
  pending: { label: "Pending", className: "text-amber-600", icon: Loader2 },
  lto_verified: { label: "LTO Verified", className: "text-emerald-600", icon: CheckCircle2 },
  mismatch: { label: "Mismatch found", className: "text-amber-600", icon: AlertTriangle },
  expired: { label: "Registration expired", className: "text-destructive", icon: XCircle },
};

export function LtoVerificationSection({ listingId }: { listingId: string | null }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const verify = useServerFn(verifyListingDocuments);
  const remove = useServerFn(deleteListingDocument);
  const [uploadingType, setUploadingType] = useState<"cr" | "or" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const crRef = useRef<HTMLInputElement>(null);
  const orRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["listing-verification", listingId],
    queryFn: () => getListingVerification({ data: { listingId: listingId! } }),
    enabled: !!listingId && !!user,
  });

  if (!listingId) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Anti-Scam Verification (LTO documents)
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Save your listing first, then come back here to upload your LTO Certificate of
          Registration (CR) and Official Receipt (OR). Our AI cross-checks the documents against your
          listing to earn an <span className="font-medium text-emerald-600">LTO Verified</span> badge.
        </p>
      </section>
    );
  }

  const docs = data?.documents ?? [];
  const cr = docs.find((d) => d.doc_type === "cr");
  const or = docs.find((d) => d.doc_type === "or");
  const verification = data?.verification;
  const status = verification?.status ?? "unverified";
  const StatusIcon = STATUS_LABEL[status].icon;
  const mismatches = (verification?.mismatches_json ?? []) as FieldCheck[];

  const handleUpload = async (file: File, docType: "cr" | "or") => {
    if (!user) return;
    if (file.size > MAX_SIZE) {
      toast.error("File too large (max 10 MB)");
      return;
    }
    setUploadingType(docType);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-100);
      const path = `${user.id}/${listingId}/${docType}_${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("listing-documents")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw new Error(upErr.message);

      // If an existing doc of this type exists, remove it (and its storage file).
      const existing = docs.find((d) => d.doc_type === docType);
      if (existing) {
        await supabase.storage.from("listing-documents").remove([existing.storage_path]);
        await supabase.from("listing_documents").delete().eq("id", existing.id);
      }

      const { error: insErr } = await supabase.from("listing_documents").insert({
        listing_id: listingId,
        user_id: user.id,
        doc_type: docType,
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
      });
      if (insErr) throw new Error(insErr.message);

      toast.success(`${docType.toUpperCase()} uploaded`);
      qc.invalidateQueries({ queryKey: ["listing-verification", listingId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingType(null);
      if (crRef.current) crRef.current.value = "";
      if (orRef.current) orRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove({ data: { documentId: id } });
      qc.invalidateQueries({ queryKey: ["listing-verification", listingId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const runVerify = async () => {
    setVerifying(true);
    try {
      const res = await verify({ data: { listingId } });
      qc.invalidateQueries({ queryKey: ["listing-verification", listingId] });
      if (res.status === "lto_verified") toast.success("LTO Verified ✓ Badge earned.");
      else if (res.status === "expired") toast.error("Registration is expired.");
      else if (res.status === "mismatch") toast.warning("Mismatches found — review below.");
      else toast.info("Verification complete.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const DocSlot = ({
    docType,
    file,
    inputRef,
  }: {
    docType: "cr" | "or";
    file?: (typeof docs)[number];
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) => (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium">
          {docType === "cr" ? "Certificate of Registration (CR)" : "Official Receipt (OR)"}
        </div>
        {file && (
          <button
            type="button"
            onClick={() => handleDelete(file.id)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f, docType);
        }}
      />
      {file ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="truncate">
            {file.mime_type.split("/")[1]?.toUpperCase()} · {(file.file_size / 1024).toFixed(0)} KB
          </span>
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">
          PNG or JPG photo of the document, max 10 MB.
        </p>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 w-full"
        disabled={uploadingType === docType}
        onClick={() => inputRef.current?.click()}
      >
        {uploadingType === docType ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1 h-3.5 w-3.5" />
        )}
        {file ? "Replace" : "Upload"}
      </Button>
    </div>
  );

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Anti-Scam Verification (LTO documents)</h3>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${STATUS_LABEL[status].className}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${status === "pending" && verifying ? "animate-spin" : ""}`} />
          {STATUS_LABEL[status].label}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload your CR and OR. We use AI to compare them to your listing (VIN, make/model, year,
        color, plate) and check the OR expiry — earning your listing a public{" "}
        <span className="font-medium text-emerald-600">LTO Verified</span> badge. Documents are
        private and only visible to you and our review team.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <DocSlot docType="cr" file={cr} inputRef={crRef} />
        <DocSlot docType="or" file={or} inputRef={orRef} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {docs.length === 0
            ? "Upload at least one document to verify."
            : `${docs.length}/2 document${docs.length > 1 ? "s" : ""} uploaded`}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={runVerify}
          disabled={verifying || docs.length === 0}
        >
          {verifying ? (
            <>
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              {verification ? "Re-verify" : "Verify documents"}
            </>
          )}
        </Button>
      </div>

      {verification && (
        <div className="mt-3 space-y-1.5">
          {mismatches.map((c) => (
            <div
              key={c.field}
              className={
                "flex items-start gap-2 rounded border px-2 py-1.5 text-[11px] " +
                (c.match === "match"
                  ? "border-emerald-400/50 bg-emerald-50/60 dark:bg-emerald-950/20"
                  : c.match === "mismatch"
                  ? "border-amber-400/60 bg-amber-50 dark:bg-amber-950/20"
                  : "border-border bg-muted/30")
              }
            >
              {c.match === "match" ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : c.match === "mismatch" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              ) : (
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.label}</div>
                <div className="text-muted-foreground">
                  Listing: <span className="font-mono">{c.listingValue || "—"}</span>
                  {" · "}
                  Document: <span className="font-mono">{c.documentValue || "—"}</span>
                </div>
              </div>
            </div>
          ))}
          {verification.checked_at && (
            <p className="text-[10px] text-muted-foreground">
              Last checked {new Date(verification.checked_at).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
