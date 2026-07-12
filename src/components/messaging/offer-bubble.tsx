import { Tag, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  amount: number | null;
  currency: string | null;
  status: string | null;
  note: string | null;
  mine: boolean;
  canRespond: boolean;
  messageId: string;
  onUpdated?: (patch: { offer_status: string }) => void;
}

function fmt(n: number, ccy: string) {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: ccy || "PHP",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₱${n.toLocaleString()}`;
  }
}

export function OfferBubble({
  amount,
  currency,
  status,
  note,
  mine,
  canRespond,
  messageId,
  onUpdated,
}: Props) {
  const respond = async (next: "accepted" | "declined") => {
    const { error } = await supabase
      .from("messages")
      .update({ offer_status: next })
      .eq("id", messageId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(next === "accepted" ? "Offer accepted" : "Offer declined");
    onUpdated?.({ offer_status: next });
  };

  const st = status ?? "pending";
  const badgeColor =
    st === "accepted"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : st === "declined"
        ? "bg-destructive/15 text-destructive"
        : "bg-amber-500/15 text-amber-600 dark:text-amber-400";

  return (
    <div
      className={`min-w-[180px] rounded-xl border p-3 ${
        mine ? "border-primary-foreground/30 bg-primary-foreground/5" : "border-border bg-background/60"
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        <Tag className="h-3 w-3" /> {mine ? "You sent an offer" : "Offer received"}
      </div>
      <div className={`text-lg font-bold ${mine ? "" : "text-primary"}`}>
        {amount != null ? fmt(amount, currency ?? "PHP") : "—"}
      </div>
      {note && <div className="mt-1 text-xs opacity-80">{note}</div>}
      <div className="mt-2 flex items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${badgeColor}`}>
          {st}
        </span>
        {canRespond && st === "pending" && (
          <div className="ml-auto flex gap-1">
            <button
              type="button"
              onClick={() => respond("accepted")}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600"
            >
              <Check className="h-3 w-3" /> Accept
            </button>
            <button
              type="button"
              onClick={() => respond("declined")}
              className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground hover:opacity-90"
            >
              <X className="h-3 w-3" /> Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
