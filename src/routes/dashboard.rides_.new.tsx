import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehiclePicker } from "@/components/vehicle-picker";
import { useServerFn } from "@tanstack/react-start";
import { createRide } from "@/lib/rides.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/rides_/new")({
  component: NewRidePage,
});

function NewRidePage() {
  const navigate = useNavigate();
  const create = useServerFn(createRide);
  const [name, setName] = useState("");
  const [vehicleType, setVehicleType] = useState<"car" | "motorcycle">("car");
  const [v, setV] = useState<{ year: string; make: string; model: string; engine?: string }>({
    year: "",
    make: "",
    model: "",
    engine: "",
  });
  const [trim, setTrim] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Give your ride a name");
    setBusy(true);
    try {
      const res = await create({
        data: {
          name: name.trim(),
          year: v.year ? Number(v.year) : null,
          make: v.make || null,
          model: v.model || null,
          trim: trim || null,
          engine: v.engine || null,
          vehicle_type: vehicleType,
        },
      });
      toast.success("Ride created");
      navigate({ to: "/dashboard/rides/$id/edit", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Add a ride</h1>
        <p className="text-sm text-muted-foreground">
          Start with the basics — you can add photos, mods and history next.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Nickname</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Project Stancekipo"
        />
      </div>
      <div className="space-y-2">
        <Label>Vehicle type</Label>
        <div className="flex gap-2">
          {(["car", "motorcycle"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={vehicleType === t ? "default" : "outline"}
              size="sm"
              onClick={() => setVehicleType(t)}
            >
              {t === "car" ? "Car / SUV / Truck" : "Motorcycle"}
            </Button>
          ))}
        </div>
      </div>
      <VehiclePicker
        category={vehicleType}
        year={v.year}
        make={v.make}
        model={v.model}
        engine={v.engine}
        onChange={setV}
      />
      <div className="space-y-2">
        <Label>Trim (optional)</Label>
        <Input
          value={trim}
          onChange={(e) => setTrim(e.target.value)}
          placeholder="e.g. Type R, Sport, GR"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create ride"}
        </Button>
      </div>
    </form>
  );
}
