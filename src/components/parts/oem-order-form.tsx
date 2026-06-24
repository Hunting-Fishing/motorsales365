import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Hash, Car, Send, Clock, CheckCircle2, ShieldCheck, Truck, Sparkles } from "lucide-react";
import { submitOemPartsInterest } from "@/lib/parts-fulfillment.functions";
import { useAuth } from "@/hooks/use-auth";

type Mode = "vin" | "vehicle";

export function OemOrderForm() {
  const submit = useServerFn(submitOemPartsInterest);
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("vin");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [trim, setTrim] = useState("");
  const [engine, setEngine] = useState("");
  const [partsDescription, setPartsDescription] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");

  function reset() {
    setVin("");
    setMake("");
    setModel("");
    setYear("");
    setTrim("");
    setEngine("");
    setPartsDescription("");
    setPhone("");
    setDone(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const payload =
      mode === "vin"
        ? { vin: vin.trim(), parts_description: partsDescription, contact_email: email, contact_phone: phone }
        : {
            make: make.trim(),
            model: model.trim(),
            year: year ? Number(year) : undefined,
            trim: trim.trim(),
            engine: engine.trim(),
            parts_description: partsDescription,
            contact_email: email,
            contact_phone: phone,
          };

    setSubmitting(true);
    try {
      await submit({ data: payload as any });
      setDone(true);
      toast.success("Request received — we'll email you when OEM ordering goes live.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h3 className="font-display text-lg font-semibold">Request received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Thanks — we'll email <span className="font-medium text-foreground">{email}</span> the
          moment online OEM parts ordering goes live for your vehicle. We may also reach out if
          we source a match sooner through our partner network.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Submit another vehicle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Online OEM parts ordering — coming soon
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              We're building genuine-OEM ordering by VIN/chassis or make + model, sourced through
              partner dealers. Tell us what you need and we'll email you the moment it's live for
              your vehicle. Used-parts marketplace is already live in the other tabs.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        {/* Mode toggle */}
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setMode("vin")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
              mode === "vin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Hash className="h-4 w-4" /> By VIN / chassis
          </button>
          <button
            type="button"
            onClick={() => setMode("vehicle")}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
              mode === "vehicle" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Car className="h-4 w-4" /> By make &amp; model
          </button>
        </div>

        {mode === "vin" ? (
          <div>
            <label className="block text-sm font-medium">VIN or chassis number</label>
            <input
              required
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              maxLength={17}
              placeholder="e.g. JT2BG22K8X0123456"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono tracking-wider"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              11–17 characters. Letters I, O, Q never appear in VINs. Found on the dashboard,
              door jamb, or chassis stamp.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium">Make</label>
              <input
                required
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Toyota"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium">Model</label>
              <input
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Hilux"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Year</label>
              <input
                required
                type="number"
                min={1900}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2018"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Trim (optional)</label>
              <input
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                placeholder="G 4x4"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Engine (optional)</label>
              <input
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                placeholder="2.4L 2GD-FTV diesel"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium">What part(s) do you need?</label>
          <textarea
            required
            minLength={5}
            maxLength={1000}
            value={partsDescription}
            onChange={(e) => setPartsDescription(e.target.value)}
            rows={3}
            placeholder="e.g. Front brake rotors and pads, genuine OEM only. Also looking for an OEM cabin air filter."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">{partsDescription.length}/1000</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+63 ..."
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Sending…" : "Notify me when OEM ordering goes live"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          No spam. You'll only hear from us about your request.
        </p>
      </form>

      {/* Roadmap explainer */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
          <p className="font-semibold">Genuine OEM only</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sourced through authorised dealer partners with original part numbers.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <Sparkles className="mb-2 h-5 w-5 text-primary" />
          <p className="font-semibold">Fitment-checked</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your VIN or vehicle is matched to the correct part number before any order.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <Truck className="mb-2 h-5 w-5 text-primary" />
          <p className="font-semibold">Nationwide shipping</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Delivered from partner dealers across the Philippines once ordering launches.
          </p>
        </div>
      </div>
    </div>
  );
}
