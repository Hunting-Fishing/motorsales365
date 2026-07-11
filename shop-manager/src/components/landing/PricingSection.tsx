import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Check, Sparkles, Wrench, Droplets, Target, Anchor, Star, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PRICING_TIERS, MODULES, TierKey } from '@/config/pricing';
import { MODULE_STRIPE_PRICING, ModuleId } from '@/config/stripePricing';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const iconMap = {
  Wrench,
  Droplets,
  Target,
  Anchor
};

export function PricingSection() {
  const [selectedModule, setSelectedModule] = useState<ModuleId>('repair-shop');
  const [checkingOut, setCheckingOut] = useState<TierKey | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const modulePricing = MODULE_STRIPE_PRICING[selectedModule];

  const handleStartTrial = async (tierKey: TierKey) => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/staff-login');
      return;
    }

    setCheckingOut(tierKey);
    
    try {
      const priceId = modulePricing[tierKey].priceId;
      
      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: { priceId },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCheckingOut(null);
    }
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose your industry module and pick the tier that fits your business.
          </p>
        </div>

        {/* Module Selector Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {MODULES.map((module) => {
            const Icon = iconMap[module.icon as keyof typeof iconMap] || Droplets;
            return (
              <button
                key={module.id}
                onClick={() => setSelectedModule(module.id as ModuleId)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all",
                  selectedModule === module.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{module.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Module Description */}
        <p className="text-center text-muted-foreground mb-8">
          {MODULES.find(m => m.id === selectedModule)?.description}
        </p>

        {/* Pricing Tiers */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {(Object.keys(PRICING_TIERS) as TierKey[]).map((tierKey) => {
            const tier = PRICING_TIERS[tierKey];
            const stripeTier = modulePricing[tierKey];
            const isPopular = 'popular' in tier && tier.popular;
            const isCheckingOut = checkingOut === tierKey;

            return (
              <Card
                key={tierKey}
                className={cn(
                  "relative overflow-hidden transition-all",
                  isPopular
                    ? "border-2 border-primary shadow-lg scale-[1.02]"
                    : "border-border"
                )}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Most Popular
                    </div>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-3 mx-auto">
                    <Sparkles className="h-3 w-3" />
                    14-Day Free Trial
                  </div>
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${stripeTier.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    size="lg"
                    className="w-full"
                    variant={isPopular ? "default" : "outline"}
                    onClick={() => handleStartTrial(tierKey)}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Start Free Trial'
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    No credit card required
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground">
            Need a custom solution?{' '}
            <Link to="/contact" className="text-primary hover:underline font-medium">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
