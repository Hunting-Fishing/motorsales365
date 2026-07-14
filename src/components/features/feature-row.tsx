import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Trophy, Image as ImageIcon } from "lucide-react";
import { StatusBadge } from "./status-badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Feature } from "@/data/features-catalog";

export function FeatureRow({ f }: { f: Feature }) {
  return (
    <AccordionItem value={f.id} className="border-b">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-1 items-center gap-3 pr-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{f.name}</span>
              <StatusBadge status={f.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{f.pitch}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid gap-6 pt-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Screenshot column */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-secondary/40 to-secondary/10 aspect-video flex items-center justify-center">
            <div className="text-center px-6">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <ImageIcon className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-medium">{f.name}</p>
              {f.route && (
                <Link
                  to={f.route}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View live page <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          {/* Copy column */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                How it works
              </h4>
              <p className="mt-1 text-sm">{f.howItWorks}</p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Why it's useful
              </h4>
              <ul className="mt-1 space-y-1">
                {f.whyUseful.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-primary" /> How we match or beat
                competitors
              </h4>
              <ul className="mt-1 space-y-1">
                {f.vsCompetition.map((b) => (
                  <li key={b} className="text-sm text-muted-foreground">
                    · {b}
                  </li>
                ))}
              </ul>
            </div>

            {f.route && (
              <Link
                to={f.route}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open {f.name} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
