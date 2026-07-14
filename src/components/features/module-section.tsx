import * as Icons from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { FeatureRow } from "./feature-row";
import type { Feature, FeatureModule } from "@/data/features-catalog";
import { MODULES } from "@/data/features-catalog";
import type { LatestScreenshot } from "./feature-screenshot";

export function ModuleSection({
  moduleId,
  features,
  screenshots,
}: {
  moduleId: FeatureModule;
  features: Feature[];
  screenshots?: Record<string, NonNullable<LatestScreenshot>>;
}) {
  const mod = MODULES.find((m) => m.id === moduleId);
  if (!mod || features.length === 0) return null;
  const Icon = (Icons as any)[mod.icon] ?? Icons.Star;

  return (
    <section id={mod.id} className="scroll-mt-40">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            {mod.label}
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              · {features.length} feature{features.length === 1 ? "" : "s"}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">{mod.intro}</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
        <Accordion type="multiple" className="px-4">
          {features.map((f) => (
            <FeatureRow key={f.id} f={f} latestScreenshot={screenshots?.[f.id] ?? null} />
          ))}
        </Accordion>
      </div>
    </section>
  );
}
