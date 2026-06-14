import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X } from "lucide-react";
import { createPartQuoteRequest } from "@/lib/parts-fulfillment.functions";
import { useAuth } from "@/hooks/use-auth";
import { FormFeedbackLink } from "@/components/form-feedback";

export type QuoteItem = {
  kind: "catalog" | "custom";
  catalog_id?: string | null;
  label: string;
  qty?: number;
};

interface Props {
  open: boolean;
  onClose: () => void;
  items: QuoteItem[];
  listingId?: string;
  rideId?: string;
  title?: string;
}

export function PartQuoteDialog({
  open,
  onClose,
  items,
  listingId,
  rideId,
  title = "Request parts quote",
}: Props) {
  const { user } = useAuth();
  const submit = useServerFn(createPartQuoteRequest);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      toast.error("Add a phone or email so we can reach you.");
      return;
    }
    setBusy(true);
    try {
      await submit({
        data: {
          listingId: listingId ?? null,
          rideId: rideId ?? null,
          contact_name: name.trim(),
          contact_phone: phone.trim() || null,
          contact_email: email.trim() || null,
          delivery_method: method,
          notes: notes.trim() || null,
          items,
        },
      });
      toast.success("Quote request sent. We'll be in touch shortly.");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-card shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-display text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-secondary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 p-5">
          <div className="rounded-md border border-border bg-background/50 p-3 text-xs">
            <div className="mb-1 font-medium text-muted-foreground">Requested items</div>
            <ul className="list-disc pl-4">
              {items.map((it, i) => (
                <li key={i}>
                  {it.label}
                  {it.qty ? ` × ${it.qty}` : ""}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                required
              />
            </Field>
            <Field label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </Field>
            <Field label="Delivery" className="sm:col-span-2">
              <div className="flex gap-2">
                {(["pickup", "delivery"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-md border px-3 py-1.5 text-xs ${
                      method === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {m === "pickup" ? "Pickup" : "Delivery"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                placeholder="Tire size, OEM vs aftermarket preference, timing, etc."
              />
            </Field>
          </div>
          <p className="text-[11px] text-muted-foreground">
            No payment now — we'll send a quote with parts options and pricing first.
          </p>
          <div className="pt-1"><FormFeedbackLink formId="part-quote-request" /></div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}
