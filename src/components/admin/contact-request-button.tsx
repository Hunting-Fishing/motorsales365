import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createStaffContactRequest } from "@/lib/staff-contact-requests.functions";

type Props = {
  ownerId: string;
  ownerLabel?: string;
  clientProfileId?: string | null;
  leadId?: string | null;
  adInquiryId?: string | null;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost" | "secondary";
};

/**
 * Button + dialog that lets a sales/advertising staff member request
 * permission to contact a client/lead/inquiry owned by another staff
 * member. Creates a row in `staff_client_contact_requests` (pending) which
 * the owner can approve or deny from `/dashboard/staff-requests`.
 */
export function ContactRequestButton({
  ownerId,
  ownerLabel,
  clientProfileId,
  leadId,
  adInquiryId,
  size = "sm",
  variant = "outline",
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createStaffContactRequest);

  async function submit() {
    if (reason.trim().length < 5) {
      toast.error("Please provide a short reason (5+ characters)");
      return;
    }
    setBusy(true);
    try {
      await create({
        data: {
          owner_id: ownerId,
          client_profile_id: clientProfileId ?? null,
          lead_id: leadId ?? null,
          ad_inquiry_id: adInquiryId ?? null,
          reason: reason.trim(),
          expires_in_days: days,
        },
      });
      toast.success("Request sent — awaiting approval");
      setOpen(false);
      setReason("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size} variant={variant} className="gap-1">
          <Send className="h-3.5 w-3.5" />
          Request access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request to contact this client</DialogTitle>
          <DialogDescription>
            {ownerLabel
              ? `Sent to ${ownerLabel}. They must approve before you can reach the client.`
              : "Sent to the assigned staff member. They must approve before you can reach the client."}
            {" "}All decisions are logged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="scc-reason">Reason</Label>
            <Textarea
              id="scc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you need to reach this client?"
              rows={4}
              maxLength={2000}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="scc-days">Access window (days)</Label>
            <Input
              id="scc-days"
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 7)))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
