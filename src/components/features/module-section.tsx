import * as Icons from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { FeatureRow } from "./feature-row";
import type { Feature, FeatureModule } from "@/data/features-catalog";
import { MODULES } from "@/data/features-catalog";

export function ModuleSection({
  moduleId,
  features,
}: {
  moduleId: FeatureModule;
  features: Feature[];
}) {
  const mod = MODULES.find((m) => m.id === moduleId);
  if (!mod || features.length === 0) return null;
  const Icon = (Icons as any)[mod.icon] ?? Icons.Star;

  return (
    <section id={mod.id} className="scroll-mt-24">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {mod.label}
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              · {features.length} feature{features.length === 1 ? "" : "s"}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">{mod.intro}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Accordion type="multiple" className="px-4">
          {features.map((f) => (
            <FeatureRow key={f.id} f={f} />
          ))}
        </Accordion>
      </div>
    </section>
  );
}
