import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GradientOrbs } from './GradientOrbs';

export interface ModuleHeroPill {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: string; // gradient & text classes, optional
}

export interface ModuleHeroAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface ModuleHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  /** Tailwind gradient pair, e.g. "from-indigo-500 to-violet-500" */
  accentGradient: string;
  pills?: ModuleHeroPill[];
  actions?: ModuleHeroAction[];
  orbColors?: [string, string, string];
  bgImage?: string;
  className?: string;
}

export function ModuleHero({
  eyebrow = 'Active Module',
  title,
  description,
  icon: Icon,
  accentGradient,
  pills = [],
  actions = [],
  orbColors,
  bgImage,
  className,
}: ModuleHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 text-white shadow-xl',
        className,
      )}
    >
      <GradientOrbs colors={orbColors} intensity="normal" />

      {bgImage && (
        <img
          src={bgImage}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover object-left opacity-30 mix-blend-screen md:block"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
          }}
        />
      )}

      <div className="relative z-10 flex flex-col gap-6 p-6 md:p-10">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg',
              accentGradient,
            )}
          >
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">{eyebrow}</p>
            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              {title}
            </h1>
          </div>
        </div>

        {description && <p className="max-w-2xl text-sm text-slate-300 md:text-base">{description}</p>}

        {pills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pills.map((pill) => (
              <div
                key={pill.label}
                className={cn(
                  'flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium backdrop-blur text-white/90',
                  pill.accent,
                )}
              >
                <pill.icon className="h-3.5 w-3.5" />
                <span className="opacity-80">{pill.label}</span>
                <span className="font-bold tabular-nums">{pill.value}</span>
              </div>
            ))}
          </div>
        )}

        {actions.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-2">
            {actions.map((a, i) => {
              const isPrimary = (a.variant ?? (i === 0 ? 'primary' : 'secondary')) === 'primary';
              return (
                <Button
                  key={a.label}
                  onClick={a.onClick}
                  size="lg"
                  variant={isPrimary ? 'default' : 'outline'}
                  className={cn(
                    isPrimary
                      ? cn('bg-gradient-to-r text-white shadow-lg hover:brightness-110 transition-all border-0', accentGradient)
                      : 'border-white/20 bg-white/5 text-white backdrop-blur hover:bg-white/10 hover:text-white',
                  )}
                >
                  {a.icon && <a.icon className="mr-2 h-4 w-4" />} {a.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
