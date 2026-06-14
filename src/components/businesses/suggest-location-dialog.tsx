import { useEffect, useState } from "react";
import { MapPinned, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/businesses/location-picker";
import { submitLocationCorrection } from "@/lib/location-corrections.functions";

type Props = {
  businessId: string;
  businessName: string;
  currentLat: number | null;
  currentLng: number | null;
  region?: string | null;
};

export function SuggestLocationDialog({
  businessId,
  businessName,
  currentLat,
  currentLng,
  region,
}: Props) {
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(currentLat);
  const [lng, setLng] = useState<number | null>(currentLng);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = useServerFn(submitLocationCorrection);

  useEffect(() => {
    if (open) {
      setLat(currentLat);
      setLng(currentLng);
      setNote("");
    }
  }, [open, currentLat, currentLng]);

  const moved =
    lat != null &&
    lng != null &&
    (lat !== currentLat || lng !== currentLng);

  async function onSubmit() {
    if (lat == null || lng == null) {
      toast.error("Drop the pin on the correct spot first.");
      return;
    }
    if (!moved) {
      toast.error("Move the pin to a new location before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit({
        data: { businessId, lat, lng, note: note.trim() || null },
      });
      if (!res.ok && res.reason === "duplicate_pending") {
        toast.info("You already have a pending suggestion for this business.");
      } else {
        toast.success("Thanks! Your suggestion will be reviewed.");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit suggestion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MapPinned className="h-3.5 w-3.5" />
          Suggest a better location
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suggest a location fix</DialogTitle>
          <DialogDescription>
            Drag the pin (or tap the map) to where {businessName} actually is. An
            admin will review your suggestion.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <LocationPicker
            lat={lat}
            lng={lng}
            region={region ?? null}
            onChange={(la, ln) => {
              setLat(la);
              setLng(ln);
            }}
          />
          <div className="text-xs text-muted-foreground">
            {lat != null && lng != null
              ? `New: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
              : "Tap the map to drop a pin."}
          </div>
          <div>
            <Label htmlFor="suggest-note" className="text-xs">
              Note (optional)
            </Label>
            <Textarea
              id="suggest-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="e.g. The entrance is on the side street, not the highway."
              rows={3}
            />
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {note.length}/300
            </div>
          </div>
        </div>
        <div className="px-1 pt-1"><FormFeedbackLink formId="business-suggest-location" /></div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !moved}>
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Submit suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
