import React from 'react';
import { Car, Plus, FileText, Activity, Wrench, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GradientOrbs } from './GradientOrbs';
import heroCar from '@/assets/automotive-hero.jpg';

interface HeroProps {
  openJobs: number;
  todayAppointments: number;
  revenueMTD: number;
  onNewWorkOrder: () => void;
  onNewQuote: () => void;
}

export function AutomotiveHero({ openJobs, todayAppointments, revenueMTD, onNewWorkOrder, onNewQuote }: HeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 text-white shadow-2xl">
      <GradientOrbs />

      {/* Car silhouette */}
      <img
        src={heroCar}
        alt=""
        aria-hidden="true"
        width={1280}
        height={512}
        loading="eager"
        decoding="async"
        className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover object-left opacity-40 mix-blend-screen md:block"
        style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 35%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%)' }}
      />

      <div className="relative z-10 flex flex-col gap-6 p-6 md:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e85d3a] to-[#f59e0b] shadow-lg shadow-orange-500/30">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-orange-300/90">Active Module</p>
            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              Automotive Repair
            </h1>
          </div>
        </div>

        <p className="max-w-xl text-sm text-slate-300 md:text-base">
          Full-service auto repair shop command center — jobs, parts, customers, and revenue all in one place.
        </p>

        {/* Live status pills */}
        <div className="flex flex-wrap gap-2">
          <StatusPill icon={Wrench} label="Open Jobs" value={openJobs} accent="from-orange-500/20 to-orange-500/5 text-orange-200 border-orange-400/30" />
          <StatusPill icon={Activity} label="Today" value={todayAppointments} accent="from-indigo-500/20 to-indigo-500/5 text-indigo-200 border-indigo-400/30" />
          <StatusPill icon={DollarSign} label="MTD" value={`$${revenueMTD.toLocaleString()}`} accent="from-emerald-500/20 to-emerald-500/5 text-emerald-200 border-emerald-400/30" />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            onClick={onNewWorkOrder}
            size="lg"
            className="bg-gradient-to-r from-[#e85d3a] to-[#f59e0b] text-white shadow-lg shadow-orange-600/30 hover:shadow-xl hover:shadow-orange-600/40 hover:brightness-110 transition-all border-0"
          >
            <Plus className="mr-2 h-4 w-4" /> New Work Order
          </Button>
          <Button
            onClick={onNewQuote}
            size="lg"
            variant="outline"
            className="border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white"
          >
            <FileText className="mr-2 h-4 w-4" /> New Quote
          </Button>
        </div>
      </div>
    </section>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; accent: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-full border bg-gradient-to-r px-3 py-1.5 text-xs font-medium backdrop-blur ${accent}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="opacity-80">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}
