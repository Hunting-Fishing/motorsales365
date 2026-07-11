import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBusinessModules, useShopEnabledModules, useToggleModule } from '@/hooks/useEnabledModules';
import { useModuleAccess, useSubscribeToModule } from '@/hooks/useModuleSubscriptions';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MODULE_CONFIGS, TIER_CONFIGS, TierSlug, calculateModulePrice, getPaidTiers } from '@/config/moduleSubscriptions';
import { UPCOMING_MODULES } from '@/config/moduleRoutes';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Car, Target, Droplets, Anchor, Wind, Zap, Pipette,
  Truck, Wrench, ShieldCheck, Megaphone, Heart, Package, Users,
  Lock, Sparkles, CreditCard, Clock, CheckCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Car, Target, Droplets, Anchor, Wind, Zap, Pipette,
  Truck, Wrench, ShieldCheck, Megaphone, Heart, Package, Users,
};

function getIcon(iconName: string | null) {
  if (!iconName) return Package;
  return iconMap[iconName] || Package;
}

export default function BusinessModulesSettings() {
  const { toast } = useToast();
  const { data: userRoles = [] } = useUserRoles();
  const { data: modules = [], isLoading: modulesLoading } = useBusinessModules();
  const { data: enabledModules = [], isLoading: enabledLoading } = useShopEnabledModules();
  const toggleModule = useToggleModule();
  const { 
    hasModuleAccess, 
    getSubscriptionForModule, 
    getModuleTier,
    getActiveSubscriptionCount,
    trialActive, 
    trialEndsAt, 
    isLoading: subLoading 
  } = useModuleAccess();
  const subscribeToModule = useSubscribeToModule();
  
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const isOwner = userRoles.includes('owner');
  const isLoading = modulesLoading || enabledLoading || subLoading;

  const enabledModuleIds = new Set(enabledModules.map(em => em.module_id));

  const isModuleEnabled = (moduleId: string, defaultEnabled: boolean): boolean => {
    if (enabledModules.length === 0) return defaultEnabled;
    return enabledModuleIds.has(moduleId);
  };

  const handleToggle = async (moduleId: string, moduleName: string, currentlyEnabled: boolean) => {
    if (!isOwner) {
      toast({
        title: "Permission Denied",
        description: "Only owners can manage business modules.",
        variant: "destructive",
      });
      return;
    }

    try {
      await toggleModule.mutateAsync({ moduleId, enabled: !currentlyEnabled });
      toast({
        title: currentlyEnabled ? "Module Disabled" : "Module Enabled",
        description: `${moduleName} has been ${currentlyEnabled ? 'disabled' : 'enabled'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update module. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubscribe = async (moduleSlug: string, tier: Exclude<TierSlug, 'free'>) => {
    setSelectedModule(null);
    await subscribeToModule.mutateAsync({ moduleSlug, tier });
  };

  const industryModules = modules.filter(m => m.category === 'industry');
  const operationsModules = modules.filter(m => m.category === 'operations');

  const isPurchasableModule = (slug: string) => !!MODULE_CONFIGS[slug];
  const activeSubCount = getActiveSubscriptionCount();

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Business Modules
        </h1>
        <p className="text-muted-foreground mt-2">
          Subscribe to modules relevant to your business. Get 20% off each additional module!
        </p>
        
        {trialActive && trialEndsAt && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-primary">Free Trial Active (Pro Features)</p>
              <p className="text-sm text-muted-foreground">
                Trial ends {formatDistanceToNow(new Date(trialEndsAt), { addSuffix: true })} ({format(new Date(trialEndsAt), 'MMM d, yyyy')})
              </p>
            </div>
          </div>
        )}
        
        {!isOwner && (
          <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4" />
            <span>Only owners can manage business modules. Contact your administrator for changes.</span>
          </div>
        )}
      </div>

      {/* Industry Modules */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            Industry Modules
            <Badge variant="secondary">Subscription Required</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose the industries your business serves. Each module has Free, Starter ($9), Pro ($29), and Business ($49) tiers.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {industryModules.map(module => {
            const Icon = getIcon(module.icon);
            const enabled = isModuleEnabled(module.id, module.default_enabled);
            const hasAccess = hasModuleAccess(module.slug);
            const subscription = getSubscriptionForModule(module.slug);
            const currentTier = getModuleTier(module.slug);
            const isPurchasable = isPurchasableModule(module.slug);
            
            return (
              <Card 
                key={module.id} 
                className={`transition-all ${hasAccess ? 'border-primary/50 bg-primary/5' : 'border-dashed'}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${hasAccess ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${hasAccess ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {module.name}
                        </CardTitle>
                        {currentTier !== 'free' && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {TIER_CONFIGS[currentTier].name} Tier
                          </Badge>
                        )}
                      </div>
                    </div>
                    {hasAccess && !trialActive && subscription && (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                    {hasAccess && trialActive && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Trial
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <CardDescription className="text-sm">
                    {module.description}
                  </CardDescription>
                  
                  {isPurchasable && !hasAccess && !trialActive && (
                    <Button 
                      onClick={() => setSelectedModule(module.slug)}
                      disabled={!isOwner}
                      className="w-full gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Choose Plan
                    </Button>
                  )}
                  
                  {isPurchasable && trialActive && !subscription && (
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedModule(module.slug)}
                      disabled={!isOwner}
                      className="w-full gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Subscribe Now
                    </Button>
                  )}
                  
                  {subscription && (
                    <p className="text-xs text-muted-foreground">
                      Renews {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                    </p>
                  )}
                  
                  {hasAccess && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Enabled in navigation</span>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleToggle(module.id, module.name, enabled)}
                        disabled={!isOwner || toggleModule.isPending}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Operations Modules */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Operations Modules</h2>
          <p className="text-sm text-muted-foreground">
            Additional tools included with any subscription
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {operationsModules.map(module => {
            const Icon = getIcon(module.icon);
            const enabled = isModuleEnabled(module.id, module.default_enabled);
            
            return (
              <Card 
                key={module.id} 
                className={`transition-all ${enabled ? 'border-primary/50 bg-primary/5' : 'opacity-75'}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {module.name}
                          <Badge variant="secondary" className="text-xs">Included</Badge>
                        </CardTitle>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => handleToggle(module.id, module.name, enabled)}
                      disabled={!isOwner || toggleModule.isPending}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm">
                    {module.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Upcoming Modules Section */}
      {UPCOMING_MODULES.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Upcoming Modules
                <Badge variant="secondary">{UPCOMING_MODULES.length} Coming Soon</Badge>
              </h2>
              <p className="text-sm text-muted-foreground">
                New industry modules we're working on. Stay tuned!
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/upcoming-modules">View All</Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {UPCOMING_MODULES.slice(0, 6).map(module => {
              const Icon = module.icon;
              return (
                <Card 
                  key={module.slug} 
                  className="border-dashed opacity-75 hover:opacity-100 transition-opacity"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${module.gradientFrom} ${module.gradientTo}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{module.name}</CardTitle>
                          {module.expectedDate && (
                            <Badge variant="outline" className="text-xs mt-1 bg-amber-500/10 text-amber-600 border-amber-500/30">
                              {module.expectedDate}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-sm">
                      {module.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {UPCOMING_MODULES.length > 6 && (
            <div className="text-center">
              <Button variant="ghost" asChild>
                <Link to="/upcoming-modules">
                  View all {UPCOMING_MODULES.length} upcoming modules →
                </Link>
              </Button>
            </div>
          )}
        </section>
      )}

      <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose Your Plan</DialogTitle>
            <DialogDescription>
              {selectedModule && MODULE_CONFIGS[selectedModule]?.name}
              {activeSubCount > 0 && (
                <span className="block mt-1 text-primary">
                  🎉 20% discount applied (you have {activeSubCount} active module{activeSubCount > 1 ? 's' : ''})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            {getPaidTiers().map(tier => {
              const tierConfig = TIER_CONFIGS[tier];
              const { basePrice, discountedPrice, savings } = calculateModulePrice(tier, activeSubCount);
              
              return (
                <Card 
                  key={tier} 
                  className={`relative ${tier === 'pro' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                >
                  {tier === 'pro' && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                      Popular
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg">{tierConfig.name}</CardTitle>
                    <div className="mt-2">
                      {savings > 0 ? (
                        <>
                          <span className="text-2xl font-bold">${discountedPrice}</span>
                          <span className="text-muted-foreground line-through ml-2">${basePrice}</span>
                          <span className="text-sm text-muted-foreground">/mo</span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl font-bold">${basePrice}</span>
                          <span className="text-sm text-muted-foreground">/mo</span>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        {tierConfig.limits.work_orders_per_month === -1 
                          ? 'Unlimited work orders' 
                          : `${tierConfig.limits.work_orders_per_month} work orders/mo`}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        {tierConfig.limits.customers === -1 
                          ? 'Unlimited customers' 
                          : `${tierConfig.limits.customers} customers`}
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        {tierConfig.limits.team_members === -1 
                          ? 'Unlimited team members' 
                          : `${tierConfig.limits.team_members} team members`}
                      </li>
                    </ul>
                    <Button 
                      className="w-full"
                      variant={tier === 'pro' ? 'default' : 'outline'}
                      onClick={() => selectedModule && handleSubscribe(selectedModule, tier)}
                      disabled={subscribeToModule.isPending}
                    >
                      {subscribeToModule.isPending ? 'Loading...' : 'Subscribe'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
