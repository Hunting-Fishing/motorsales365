import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Trophy, Cog, Sparkles, Link as LinkIcon, ExternalLink } from "lucide-react";
import { StatusBadge } from "./status-badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FeatureScreenshot, type LatestScreenshot } from "./feature-screenshot";
import { type Feature, PLAIN_LANGUAGE } from "@/data/features-catalog";

export function FeatureRow({ f, latestScreenshot }: { f: Feature; latestScreenshot?: LatestScreenshot }) {
  const [copied, setCopied] = useState(false);
  const copyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const url = `${window.location.origin}/features#${f.id}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <AccordionItem
      value={f.id}
      id={f.id}
      className="group/row scroll-mt-32 border-b last:border-b-0 data-[state=open]:bg-secondary/20"
    >
      <AccordionTrigger className="rounded-lg px-2 py-3 hover:no-underline">
        <div className="flex flex-1 items-center gap-3 pr-3 text-left">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{f.name}</span>
              <StatusBadge status={f.status} />
            </div>
            {PLAIN_LANGUAGE[f.id] && (
              <p className="mt-1 text-sm font-medium text-foreground/90">{PLAIN_LANGUAGE[f.id]}</p>
            )}
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.pitch}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="animate-fade-in space-y-5 px-2 pb-4 pt-1">
          {PLAIN_LANGUAGE[f.id] && (
            <div className="rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">In plain English</div>
              <p className="mt-1 text-sm leading-relaxed">{PLAIN_LANGUAGE[f.id]}</p>
            </div>
          )}
          {f.route && (
            <FeatureScreenshot
              featureId={f.id}
              route={f.route}
              label={f.name}
              latest={latestScreenshot ?? null}
            />
          )}
          <div className="grid gap-5 lg:grid-cols-3">

            <div className="rounded-xl border bg-card p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Cog className="h-3.5 w-3.5 text-primary" /> How it works
              </h4>
              <p className="mt-2 text-sm leading-relaxed">{f.howItWorks}</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Why it's useful
              </h4>
              <ul className="mt-2 space-y-1.5">
                {f.whyUseful.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Trophy className="h-3.5 w-3.5 text-primary" /> How we match or beat competitors
              </h4>
              <ul className="mt-2 space-y-1.5">
                {f.vsCompetition.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {f.route && (
              <Button asChild size="sm">
                <Link to={f.route}>
                  Open {f.name} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            {f.route && (
              <Button asChild size="sm" variant="outline">
                <a href={f.route} target="_blank" rel="noopener">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> New tab
                </a>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={copyLink}>
              <LinkIcon className="mr-1 h-3.5 w-3.5" />
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
