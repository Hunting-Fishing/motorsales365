import { useState } from "react";
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
import { ArrowRightLeft, ShieldAlert } from "lucide-react";
import { submitOwnershipTransferRequest } from "@/lib/business-claims.functions";
import { EvidenceUploader } from "@/components/business-page/evidence-uploader";

type Method = "email" | "phone" | "document";

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
  const qc = useQueryClient();
  const [step, setStep] = useState<"form" | "evidence">("form");
  const [claimId, setClaimId] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("document");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("form");
    setClaimId(null);
    setMethod("document");
    setValue("");
    setReason("");
  };

  const handleSubmit = async () => {
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
      setClaimId(res.id);
      setStep("evidence");
      qc.invalidateQueries({ queryKey: ["my-claim-requests"] });
      toast.success("Request created. Please attach proof of ownership.");
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

        {step === "form" ? (
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
              <div className="mt-1 text-[10px] text-muted-foreground">
                {reason.trim().length}/2000 — minimum 20 characters
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
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={busy || reason.trim().length < 20}
              >
                {busy ? "Submitting…" : "Continue → attach proof"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Upload at least one document proving you are the rightful owner. Admins will not
              approve without supporting documents.
            </p>
            {claimId && <EvidenceUploader claimId={claimId} businessId={businessId} />}
            <DialogFooter>
              <Button
                onClick={() => {
                  toast.success("Transfer request submitted for admin review.");
                  onOpenChange(false);
                  reset();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
