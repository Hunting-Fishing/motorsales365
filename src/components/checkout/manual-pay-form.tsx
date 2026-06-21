import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import {
  listPaymentMethods,
  submitManualPayment,
  type ManualPaymentMethod,
} from "@/lib/payments-manual.functions";

type Props = {
  kind: "listing" | "upgrade" | "boost" | "subscription" | "course";
  refId?: string | null;
  amountPhp: number;
  description?: string;
  preselectMethod?: string;
  onSuccess?: (invoiceNumber: string, paymentId: string) => void;
};

export function ManualPayForm({ kind, refId, amountPhp, description, preselectMethod, onSuccess }: Props) {
  const list = useServerFn(listPaymentMethods);
  const submit = useServerFn(submitManualPayment);
  const [methods, setMethods] = useState<ManualPaymentMethod[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState<{ invoice: string; id: string } | null>(null);

  useEffect(() => {
    list().then((all) => {
      const manuals = all.filter((m) => m.is_manual);
      setMethods(manuals);
      if (manuals.length && !selected) {
        // Prefer caller-requested method (e.g. ?method=gcash_manual) when enabled.
        const requested = preselectMethod && manuals.find((m) => m.method === preselectMethod);
        setSelected(requested ? requested.method : manuals[0].method);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectMethod]);

  const active = methods.find((m) => m.method === selected);

  const handleSubmit = async () => {
    if (!selected) return;
    setUploading(true);
    try {
      let proofPath: string | undefined;
      if (file) {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Sign in required");
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${u.user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        proofPath = path;
      }
      const res = await submit({
        data: {
          kind,
          ref_id: refId ?? null,
          method: selected,
          amount_php: amountPhp,
          reference: reference || undefined,
          notes: notes || description,
          proof_path: proofPath,
        },
      });
      setSubmitted({ invoice: res.invoice_number ?? "", id: res.id });
      toast.success("Payment submitted — pending admin review");
      onSuccess?.(res.invoice_number ?? "", res.id);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to submit");
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <div className="font-semibold">Payment submitted</div>
          <div className="text-sm text-muted-foreground">
            Invoice <span className="font-mono">{submitted.invoice}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            We'll confirm within 1 business day. You'll receive an email once approved.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={`/payments/${submitted.id}/receipt`}>View invoice</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!methods.length) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          No manual payment methods are enabled yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs uppercase text-muted-foreground">Choose a method</Label>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {methods.map((m) => (
            <button
              key={m.method}
              type="button"
              onClick={() => setSelected(m.method)}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                selected === m.method
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="font-medium">{m.label}</div>
              <Badge variant="outline" className="mt-1 text-[10px]">
                Manual review
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {active && (
        <Card>
          <CardContent className="space-y-3 p-4">
            {active.instructions_md && (
              <p className="whitespace-pre-wrap text-sm">{active.instructions_md}</p>
            )}
            {(active.account_name || active.account_number) && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                {active.account_name && (
                  <div>
                    <span className="text-muted-foreground">Account name:</span>{" "}
                    <span className="font-medium">{active.account_name}</span>
                  </div>
                )}
                {active.account_number && (
                  <div>
                    <span className="text-muted-foreground">Account number:</span>{" "}
                    <span className="font-mono font-medium">{active.account_number}</span>
                  </div>
                )}
              </div>
            )}
            {active.qr_image_url && (
              <img
                src={active.qr_image_url}
                alt={`${active.label} QR`}
                className="mx-auto h-48 w-48 rounded-md border object-contain"
              />
            )}
            <div className="rounded-md bg-primary/5 px-3 py-2 text-sm">
              Amount due:{" "}
              <span className="font-semibold">₱{amountPhp.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="reference">Your reference / transaction ID</Label>
        <Input
          id="reference"
          placeholder="e.g. GCash ref #1234567890"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proof">Upload proof of payment (screenshot or PDF)</Label>
        <Input
          id="proof"
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <Button onClick={handleSubmit} disabled={uploading || !selected} className="w-full">
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Submit for review
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Manual payments are reviewed within 1 business day.
      </p>
    </div>
  );
}
