import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Settings, Clock, Sparkles, Boxes, Zap, Rocket } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { getAllModuleRoutes, UPCOMING_MODULES } from '@/config/moduleRoutes';
import { BentoStatCard } from '@/components/module-dashboard/bento/BentoStatCard';
import { ShimmerButton } from '@/components/ui/magicui/shimmer-button';

interface ModuleHubHeaderProps {
  userName?: string;
  trialActive: boolean;
  trialEndsAt: string | null;
  activeCount?: number;
}

export function ModuleHubHeader({ userName, trialActive, trialEndsAt, activeCount = 0 }: ModuleHubHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const daysRemaining = trialEndsAt
    ? differenceInDays(new Date(trialEndsAt), new Date())
    : 0;

  const totalBuilt = getAllModuleRoutes().length;
  const totalUpcoming = UPCOMING_MODULES.length;
  const totalPlatform = totalBuilt + totalUpcoming;

  return (
    <div className="mb-8">
      {/* Trial Banner */}
      {trialActive && trialEndsAt && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-sm animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Free Trial Active</p>
                <p className="text-sm text-muted-foreground">
                  {daysRemaining > 0
                    ? `${daysRemaining} days remaining (ends ${format(new Date(trialEndsAt), 'MMM d, yyyy')})`
                    : 'Trial ending today'}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              <Clock className="w-3 h-3 mr-1" />
              {daysRemaining} days left
            </Badge>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-6 md:p-8 shadow-sm">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-3 gap-1.5 border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="w-3 h-3" /> Module Hub
            </Badge>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
              {getGreeting()}{userName ? `, ${userName}` : ''}.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Jump into a module, manage subscriptions, or explore what's coming next.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/settings/business-modules">
              <ShimmerButton className="px-5 py-2.5 text-sm font-semibold">
                <Settings className="w-4 h-4 mr-2" /> Manage Modules
              </ShimmerButton>
            </Link>
          </div>
        </div>
      </div>

      {/* Bento stat grid */}
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BentoStatCard
          title="Your Modules"
          value={activeCount}
          icon={Zap}
          gradient="from-indigo-500 to-violet-500"
          hint="Active subscriptions"
          delay={0}
        />
        <BentoStatCard
          title="Live Modules"
          value={totalBuilt}
          icon={Boxes}
          gradient="from-emerald-500 to-teal-500"
          hint="Available today"
          delay={60}
        />
        <BentoStatCard
          title="Coming Soon"
          value={totalUpcoming}
          icon={Rocket}
          gradient="from-fuchsia-500 to-pink-500"
          hint="In the pipeline"
          delay={120}
        />
        <BentoStatCard
          title="Platform Total"
          value={totalPlatform}
          icon={Sparkles}
          gradient="from-amber-500 to-orange-500"
          hint="Across all categories"
          delay={180}
        />
      </div>
    </div>
  );
}
