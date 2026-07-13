import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StripeConfigNotice } from '@/components/admin/StripeConfigNotice';

interface PaymentFormProps {
  orderId: string;
  amount: number;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  orderId,
  amount,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Create Stripe checkout session
      const { data: sessionData, error: sessionError } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          orderId,
          amount,
          currency: 'usd'
        }
      });

      if (sessionError) throw sessionError;

      // Redirect to Stripe Checkout
      if (sessionData.url) {
        window.location.href = sessionData.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Payment setup failed';
      toast({
        title: "Payment failed",
        description: errorMessage,
        variant: "destructive"
      });
      onPaymentError(errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <StripeConfigNotice />
      
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Order Total</p>
          <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
        </div>
        
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
          <p className="text-sm text-primary font-medium mb-1">Secure Payment</p>
          <p className="text-xs text-primary/70">
            You'll be redirected to Stripe's secure checkout to complete your payment.
          </p>
        </div>

        <Button 
          onClick={handlePayment} 
          disabled={isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Payment...
            </>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          By clicking "Pay", you agree to our terms of service and privacy policy.
        </p>
        </CardContent>
      </Card>
    </div>
  );
};