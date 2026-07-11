import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CreditCard, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionPlans } from './SubscriptionPlans';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';

export function BillingTab() {
  const { 
    subscribed, 
    plan, 
    subscriptionEnd, 
    loading, 
    error,
    checkSubscription, 
    openCustomerPortal 
  } = useSubscription();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Handle success/cancel from Stripe checkout
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      toast({
        title: 'Subscription activated!',
        description: 'Thank you for subscribing. Your account has been upgraded.',
      });
      checkSubscription();
    } else if (canceled === 'true') {
      toast({
        title: 'Checkout canceled',
        description: 'Your subscription checkout was canceled.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast, checkSubscription]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkSubscription();
    setIsRefreshing(false);
    toast({
      title: 'Status refreshed',
      description: 'Your subscription status has been updated.',
    });
  };

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    const result = await openCustomerPortal();
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to open billing portal',
        variant: 'destructive',
      });
    }
    setIsOpeningPortal(false);
  };

  const getPlanBadgeVariant = () => {
    switch (plan) {
      case 'business':
        return 'default';
      case 'pro':
        return 'secondary';
      case 'starter':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Status
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing details
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPlanBadgeVariant()} className="capitalize text-base px-3 py-1">
                      {plan}
                    </Badge>
                    {subscribed && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
                
                {subscriptionEnd && (
                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">Next billing date</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(new Date(subscriptionEnd), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {subscribed && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleOpenPortal}
                    disabled={isOpeningPortal}
                    className="flex-1"
                  >
                    {isOpeningPortal ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Subscription Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
        <SubscriptionPlans />
      </div>

      {/* Billing FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Can I cancel anytime?</p>
            <p>Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">What payment methods do you accept?</p>
            <p>We accept all major credit cards, debit cards, and some regional payment methods through Stripe.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Can I switch plans?</p>
            <p>Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
