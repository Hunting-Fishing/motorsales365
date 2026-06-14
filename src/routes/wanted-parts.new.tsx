import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { VehicleEnginePicker } from "@/components/parts-wanted/vehicle-engine-picker";
import { FormFeedbackLink } from "@/components/form-feedback";
import { createPartsWanted } from "@/lib/parts-wanted.functions";

export const Route = createFileRoute("/wanted-parts/new")({
  component: NewPartsWantedPage,
  head: () => ({
    meta: [
      { title: "Post a parts request — 365MotorSales" },
      {
        name: "description",
        content:
          "Tell us what part you need and we'll alert you when a matching listing appears.",
      },
    ],
  }),
});

function NewPartsWantedPage() {
  const create = useServerFn(createPartsWanted);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    kind: "part" as "part" | "parting_out",
    title: "",
    notes: "",
    make: "",
    model: "",
    year: null as number | null,
    engine_code: null as string | null,
    part_category: "",
    part_keywords: [] as string[],
    keywords_text: "",
    condition_pref: "any" as "any" | "used" | "new" | "oem" | "aftermarket",
    budget_max_php: "" as string | number,
    region: "",
    city: "",
    alert_frequency: "instant" as "off" | "instant" | "daily",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.make || !form.model) {
      toast.error("Pick a make and model");
      return;
    }
    if (form.title.trim().length < 4) {
      toast.error("Give your request a short title");
      return;
    }
    setSubmitting(true);
    try {
      const kw = form.keywords_text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await create({
        data: {
          kind: form.kind,
          title: form.title.trim(),
          notes: form.notes.trim() || undefined,
          make: form.make,
          model: form.model,
          year: form.year ?? undefined,
          engine_code: form.engine_code ?? undefined,
          part_category: form.part_category || undefined,
          part_keywords: kw,
          condition_pref: form.condition_pref,
          budget_max_php: form.budget_max_php ? Number(form.budget_max_php) : undefined,
          region: form.region || undefined,
          city: form.city || undefined,
          alert_frequency: form.alert_frequency,
        },
      });
      toast.success("Request posted — we'll watch for matches");
      navigate({ to: "/dashboard/parts-wanted" });
      return res;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <header>
        <h1 className="font-display text-2xl font-bold">Post a parts request</h1>
        <p className="text-sm text-muted-foreground">
          Tell us the vehicle and the part. We'll notify you when a matching listing appears
          and show your request on the public parts-wanted board.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-1">
          {(["part", "parting_out"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setForm({ ...form, kind: k })}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                form.kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {k === "part" ? "Need a specific part" : "Want to buy a parts/donor vehicle"}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. 4D56T turbo engine for 1991 Pajero"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            required
          />
        </div>

        <VehicleEnginePicker
          value={{
            make: form.make,
            model: form.model,
            year: form.year,
            engine_code: form.engine_code,
          }}
          onChange={(v) =>
            setForm({
              ...form,
              make: v.make,
              model: v.model,
              year: v.year ?? null,
              engine_code: v.engine_code ?? null,
            })
          }
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Part category (optional)</label>
            <input
              value={form.part_category}
              onChange={(e) => setForm({ ...form, part_category: e.target.value })}
              placeholder="engine, brakes, body, electrical…"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Condition</label>
            <select
              value={form.condition_pref}
              onChange={(e) =>
                setForm({ ...form, condition_pref: e.target.value as typeof form.condition_pref })
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="any">Any</option>
              <option value="used">Used</option>
              <option value="new">New</option>
              <option value="oem">OEM</option>
              <option value="aftermarket">Aftermarket</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">
            Keywords (comma-separated, helps matching)
          </label>
          <input
            value={form.keywords_text}
            onChange={(e) => setForm({ ...form, keywords_text: e.target.value })}
            placeholder="turbo, head, injector pump"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Max budget (PHP)</label>
            <input
              type="number"
              value={form.budget_max_php}
              onChange={(e) => setForm({ ...form, budget_max_php: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Region</label>
            <input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">City</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Alert me</label>
          <select
            value={form.alert_frequency}
            onChange={(e) =>
              setForm({ ...form, alert_frequency: e.target.value as typeof form.alert_frequency })
            }
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          >
            <option value="instant">Instantly (email + in-app)</option>
            <option value="daily">Daily digest</option>
            <option value="off">Don't alert me — I'll check the board</option>
          </select>
        </div>

        <FormFeedbackLink formId="wanted-parts-new" className="mb-1" />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Posting…" : "Post request"}
        </button>
      </form>
    </div>
  );
}
