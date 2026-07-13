import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Crown, Building2, Zap, Rocket } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MODULE_STRIPE_PRICING, ModuleId } from '@/config/stripePricing';
import { PRICING_TIERS } from '@/config/pricing';

interface SubscriptionPlansProps {
  moduleId?: ModuleId;
}

export function SubscriptionPlans({ moduleId = 'repair-shop' }: SubscriptionPlansProps) {
  const { plan: currentPlan, subscribed, createCheckout, loading } = useSubscription();
  const [subscribingTo, setSubscribingTo] = useState<string | null>(null);
  const { toast } = useToast();

  const modulePricing = MODULE_STRIPE_PRICING[moduleId] || MODULE_STRIPE_PRICING['repair-shop'];

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'For individuals and small teams getting started',
      price: '$0',
      priceId: null,
      productId: null,
      icon: Zap,
      features: [
        'Up to 5 work orders/month',
        'Basic inventory tracking',
        'Single user',
        'Email support',
        'Basic reports',
      ],
      highlighted: false,
    },
    {
      id: 'starter',
      name: PRICING_TIERS.starter.name,
      description: PRICING_TIERS.starter.description,
      price: `$${modulePricing.starter.price}`,
      priceId: modulePricing.starter.priceId,
      productId: modulePricing.starter.productId,
      icon: Rocket,
      features: PRICING_TIERS.starter.features,
      highlighted: false,
    },
    {
      id: 'pro',
      name: PRICING_TIERS.pro.name,
      description: PRICING_TIERS.pro.description,
      price: `$${modulePricing.pro.price}`,
      priceId: modulePricing.pro.priceId,
      productId: modulePricing.pro.productId,
      icon: Crown,
      features: PRICING_TIERS.pro.features,
      highlighted: true,
    },
    {
      id: 'business',
      name: PRICING_TIERS.business.name,
      description: PRICING_TIERS.business.description,
      price: `$${modulePricing.business.price}`,
      priceId: modulePricing.business.priceId,
      productId: modulePricing.business.productId,
      icon: Building2,
      features: PRICING_TIERS.business.features,
      highlighted: false,
    },
  ];

  const handleSubscribe = async (planId: string, priceId: string | null) => {
    if (!priceId) return;
    
    setSubscribingTo(planId);
    
    const result = await createCheckout(priceId);
    
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to start checkout',
        variant: 'destructive',
      });
    }
    
    setSubscribingTo(null);
  };

  const isCurrentPlan = (planId: string) => {
    if (!subscribed && planId === 'free') return true;
    return currentPlan === planId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => {
        const Icon = plan.icon;
        const isCurrent = isCurrentPlan(plan.id);
        const isSubscribing = subscribingTo === plan.id;
        
        return (
          <Card 
            key={plan.id} 
            className={cn(
              'relative flex flex-col',
              plan.highlighted && 'border-primary shadow-lg',
              isCurrent && 'ring-2 ring-primary'
            )}
          >
            {plan.highlighted && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            
            {isCurrent && (
              <Badge variant="secondary" className="absolute -top-3 right-4">
                Current Plan
              </Badge>
            )}
            
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1">
              <div className="text-center mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.price !== '$0' && (
                  <span className="text-muted-foreground">/month</span>
                )}
              </div>
              
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-1 shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.highlighted ? 'default' : 'outline'}
                disabled={isCurrent || !plan.priceId || isSubscribing}
                onClick={() => handleSubscribe(plan.id, plan.priceId)}
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isCurrent ? (
                  'Current Plan'
                ) : plan.priceId ? (
                  'Subscribe'
                ) : (
                  'Free'
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
