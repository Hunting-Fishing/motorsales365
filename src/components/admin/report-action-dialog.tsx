import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import { applyReportAction } from "@/lib/report-actions.functions";

export type ActionKind = "accept" | "dismiss" | "reverse" | "restore_listing";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reportId: string;
  action: ActionKind;
  listingId?: string | null;
  listingTitle?: string | null;
  reversesActionId?: string | null;
  onDone: () => void;
};

const COPY: Record<
  ActionKind,
  { title: string; desc: string; baseDelta: number; tone: "destructive" | "warning" | "primary" | "neutral" }
> = {
  accept: {
    title: "Accept report",
    desc: "Confirms this report describes a real violation. Use the checkboxes below to apply additional consequences. Without them, only the report status changes.",
    baseDelta: -25,
    tone: "destructive",
  },
  dismiss: {
    title: "Dismiss report",
    desc: "Marks the report as not a violation. No effect on the listing or the poster's trust score.",
    baseDelta: 0,
    tone: "neutral",
  },
  reverse: {
    title: "Reverse decision",
    desc: "Re-opens the report and refunds the original trust-score change to the poster. Hidden listings can be restored separately; deleted listings cannot be auto-restored.",
    baseDelta: 0,
    tone: "primary",
  },
  restore_listing: {
    title: "Restore listing",
    desc: "Sets the listing back to active. +10 to poster's trust score.",
    baseDelta: 10,
    tone: "primary",
  },
};

export function ReportActionDialog({
  open,
  onOpenChange,
  reportId,
  action,
  listingId,
  listingTitle,
  reversesActionId,
  onDone,
}: Props) {
  const cfg = COPY[action];
  const [note, setNote] = useState("");
  const [hide, setHide] = useState(false);
  const [del, setDel] = useState(false);
  const [notify, setNotify] = useState(true);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const applyFn = useServerFn(applyReportAction);

  const totalDelta =
    cfg.baseDelta + (hide ? -10 : 0) + (del ? -30 : 0);

  const canSubmit = (() => {
    if (busy) return false;
    if (note.trim().length < 10 && action !== "restore_listing") return false;
    if (del && confirmTitle !== (listingTitle ?? "")) return false;
    return true;
  })();

  const submit = async () => {
    setBusy(true);
    try {
      await applyFn({
        data: {
          reportId,
          action,
          note: note.trim() || null,
          hideListing: hide,
          deleteListing: del,
          notifyPoster: notify,
          reversesActionId: reversesActionId ?? null,
        },
      });
      toast.success(`${cfg.title} applied`);
      onOpenChange(false);
      onDone();
      // reset
      setNote("");
      setHide(false);
      setDel(false);
      setConfirmTitle("");
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const deltaColor =
    totalDelta < 0
      ? "text-destructive"
      : totalDelta > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {cfg.tone === "destructive" && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {cfg.title}
          </DialogTitle>
          <DialogDescription>{cfg.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Score preview */}
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Info className="h-3.5 w-3.5" /> Poster trust-score change
            </span>
            <span className={`font-mono font-semibold ${deltaColor}`}>
              {totalDelta > 0 ? "+" : ""}
              {totalDelta} pts
            </span>
          </div>

          {/* Action checkboxes (only for accept) */}
          {action === "accept" && listingId && (
            <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Follow-up consequences (optional)
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={hide} onCheckedChange={(v) => setHide(!!v)} disabled={del} />
                <span>
                  <span className="font-medium">Hide listing</span>{" "}
                  <span className="text-xs text-muted-foreground">— removes from public view, can be restored.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={del} onCheckedChange={(v) => { setDel(!!v); if (v) setHide(false); }} />
                <span>
                  <span className="font-medium text-destructive">Permanently delete listing</span>{" "}
                  <span className="text-xs text-muted-foreground">— irreversible. Requires typing the title below.</span>
                </span>
              </label>
              {del && (
                <div className="pt-1">
                  <Label className="text-xs">
                    Type <span className="font-mono">{listingTitle}</span> to confirm
                  </Label>
                  <Input
                    value={confirmTitle}
                    onChange={(e) => setConfirmTitle(e.target.value)}
                    className="mt-1 h-8"
                    placeholder={listingTitle ?? ""}
                  />
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div className="space-y-1">
            <Label htmlFor="note" className="text-xs">
              Moderator note {action !== "restore_listing" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why are you taking this action? Visible to other staff and to the poster if notified."
              className="min-h-20 text-sm"
            />
            {action !== "restore_listing" && note.trim().length < 10 && (
              <p className="text-[11px] text-muted-foreground">At least 10 characters.</p>
            )}
          </div>

          {/* Notify poster */}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
            <span>Notify poster by email (they can file a dispute within 14 days)</span>
          </label>

          {action === "reverse" && (
            <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3 text-xs">
              <Badge variant="outline" className="mb-1">Reversal</Badge>
              <p>
                The original moderation action will be marked reversed, the trust-score change refunded, and the report
                re-opened for re-review.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={cfg.tone === "destructive" ? "destructive" : "default"}
            onClick={submit}
            disabled={!canSubmit}
          >
            {busy ? "Applying…" : `Confirm ${cfg.title}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
