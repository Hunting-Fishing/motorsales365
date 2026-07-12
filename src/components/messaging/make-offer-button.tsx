import { useState } from "react";
import { Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  onSend: (offer: { amount: number; note: string }) => Promise<void>;
  listingPrice?: number | null;
  disabled?: boolean;
}

export function MakeOfferButton({ onSend, listingPrice, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(listingPrice ? String(listingPrice) : "");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter a valid offer amount");
      return;
    }
    setSending(true);
    try {
      await onSend({ amount: n, note: note.trim() });
      setOpen(false);
      setNote("");
    } catch {
      /* handled upstream */
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Make an offer"
          disabled={disabled}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
        >
          <Tag className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="mb-2 text-xs font-semibold">Make an offer</div>
        {listingPrice != null && (
          <div className="mb-2 text-[11px] text-muted-foreground">
            Asking price: ₱{listingPrice.toLocaleString()}
          </div>
        )}
        <div className="space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₱
            </span>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              className="pl-6"
            />
          </div>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            rows={2}
            maxLength={300}
          />
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={sending}>
              {sending ? "Sending…" : "Send offer"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
