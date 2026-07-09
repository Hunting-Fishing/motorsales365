import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  submitNetworkPartInquiry,
} from "@/lib/network-stock.functions";
import type { NetworkStockRow } from "@/lib/network-stock.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function NetworkPartInquiryDialog({
  row,
  onClose,
  onSubmitted,
}: {
  row: NetworkStockRow | null;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const { user } = useAuth();
  const submitFn = useServerFn(submitNetworkPartInquiry);
  const [form, setForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    quantity: 1,
    message: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) {
      setForm((f) => ({
        ...f,
        contact_email: user?.email ?? f.contact_email,
        quantity: 1,
        message: "",
      }));
    }
  }, [row, user]);

  if (!row) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitFn({
        data: {
          business_id: row.business_id,
          item_id: row.id,
          sku: row.sku,
          part_name: row.name,
          quantity: Number(form.quantity) || 1,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone || null,
          message: form.message || null,
        },
      });
      if (user) {
        toast.success("Request sent", {
          description: "Track its status in My part requests.",
          action: {
            label: "Track",
            onClick: () => {
              window.location.href = "/parts/my-requests";
            },
          },
        });
      }
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send request");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Request "{row.name}"</DialogTitle>
          <DialogDescription>
            From {row.business_name}
            {row.city ? ` — ${row.city}` : ""}. The shop will contact you to confirm
            price and pickup.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Your name</Label>
              <Input
                required
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) =>
                  setForm({ ...form, quantity: Number(e.target.value) || 1 })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                required
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Message (optional)</Label>
            <Textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Vehicle year/make/model, preferred pickup time, etc."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
