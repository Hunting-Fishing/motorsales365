import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { submitBusinessClaim } from "@/lib/business-claims.functions";

type Method = "email" | "phone" | "document" | "social";

export function ClaimCta({
  businessId,
  businessName,
  claimState,
}: {
  businessId: string;
  businessName: string;
  claimState: string;
}) {
  const { user } = useAuth();
  const submit = useServerFn(submitBusinessClaim);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<Method>("email");
  const [value, setValue] = useState("");
  const [evidence, setEvidence] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (claimState === "owned") return null;

  return (
    <Card className="border-dashed bg-muted/30 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {claimState === "claim_pending" ? "Claim under review" : "Is this your business?"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            This listing was added from public sources. Claim it to manage hours, photos, contact
            info, and respond to customers.{" "}
            <Link to="/support" className="underline">
              Request removal
            </Link>
          </p>
        </div>
        {claimState === "unclaimed" ? (
          user ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Claim this business</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Claim {businessName}</DialogTitle>
                  <DialogDescription>
                    If the contact you provide matches the one already on file and your account is
                    verified, you'll get instant access. Otherwise our team will review within 1–2
                    business days.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Verification method</Label>
                    <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Business email</SelectItem>
                        <SelectItem value="phone">Business phone</SelectItem>
                        <SelectItem value="document">Business permit / OR</SelectItem>
                        <SelectItem value="social">Official social page</SelectItem>
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
                  {(method === "document" || method === "social") && (
                    <div>
                      <Label>
                        {method === "document" ? "Evidence URL (permit, OR)" : "Official page URL"}
                      </Label>
                      <Input
                        value={evidence}
                        onChange={(e) => setEvidence(e.target.value)}
                        placeholder="https://…"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Anything our team should know."
                    />
                  </div>
                </div>
                <div className="pt-2"><FormFeedbackLink formId="business-claim" /></div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const res = await submit({
                          data: {
                            businessId,
                            contactMethod: method,
                            contactValue:
                              method === "email" || method === "phone" ? value : undefined,
                            evidenceUrl:
                              method === "document" || method === "social" ? evidence : undefined,
                            notes: notes || undefined,
                          },
                        });
                        if (res.autoApproved) {
                          toast.success("Claim approved — you now manage this business.");
                          setTimeout(() => window.location.reload(), 700);
                        } else {
                          toast.success("Claim submitted. We'll email you with the decision.");
                          setOpen(false);
                        }
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed to submit claim");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Submitting…" : "Submit claim"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button asChild size="sm">
              <Link
                to="/login"
                search={{ redirect: `/businesses/${encodeURIComponent(businessName)}` }}
              >
                Sign in to claim
              </Link>
            </Button>
          )
        ) : (
          <Button size="sm" disabled variant="outline">
            Pending review
          </Button>
        )}
      </div>
    </Card>
  );
}
