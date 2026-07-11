import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, CreditCard, Settings } from 'lucide-react';

export const StripeConfigNotice = () => {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <CreditCard className="h-5 w-5" />
          Stripe Configuration Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-orange-200">
          <Settings className="h-4 w-4" />
          <AlertDescription className="text-orange-700">
            To enable payment processing, you need to configure your Stripe integration.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h3 className="font-medium text-orange-800">Setup Steps:</h3>
          <ol className="text-sm text-orange-700 space-y-2 list-decimal list-inside">
            <li>Create a Stripe account at <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline">stripe.com</a></li>
            <li>Get your API keys from the Stripe Dashboard</li>
            <li>Add your Stripe Secret Key to Supabase Edge Function secrets</li>
            <li>Test payments in Stripe's test mode first</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://dashboard.stripe.com/apikeys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Stripe API Keys
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a 
              href="https://supabase.com/dashboard/project/oudkbrnvommbvtuispla/settings/functions" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Supabase Secrets
            </a>
          </Button>
        </div>

        <div className="text-xs text-orange-600 bg-orange-100 p-3 rounded">
          <strong>Secret Name:</strong> STRIPE_SECRET_KEY<br />
          <strong>Description:</strong> Your Stripe secret key (starts with sk_test_ for test mode or sk_live_ for live mode)
        </div>
      </CardContent>
    </Card>
  );
};