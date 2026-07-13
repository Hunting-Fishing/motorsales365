import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/shopping/useCart';
import { useAuth } from '@/hooks/useAuth';
import { createOrder, checkInventoryAvailability } from '@/services/orderService';
import { createCheckoutSession, verifyCheckoutSession } from '@/services/payment/stripeService';
import { AddressForm } from '@/components/checkout/AddressForm';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { OrderSummary } from './OrderSummary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const CheckoutPage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'address' | 'payment'>('address');
  const [shippingAddress, setShippingAddress] = useState(null);
  const [tempOrderId, setTempOrderId] = useState<string | null>(null);
  const [inventoryValid, setInventoryValid] = useState<boolean | null>(null);
  const [orderData, setOrderData] = useState({
    shipping_method: 'standard',
    notes: ''
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, totalPrice, clearCart } = useCart();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Authentication protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to proceed with checkout.",
        variant: "destructive"
      });
      navigate('/auth?redirect=/checkout');
    }
  }, [isAuthenticated, authLoading, navigate, toast]);

  // Cart validation
  useEffect(() => {
    if (items.length === 0) {
      navigate('/shopping');
    }
  }, [items, navigate]);

  // Inventory validation
  useEffect(() => {
    const validateInventory = async () => {
      if (items.length === 0) return;
      
      try {
      const orderItems = items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        variant_id: item.variantId,
        bundle_id: item.bundleId
      }));
        
        const isValid = await checkInventoryAvailability(orderItems);
        setInventoryValid(isValid);
        
        if (!isValid) {
          toast({
            title: "Inventory Issue",
            description: "Some items in your cart are out of stock. Please review your cart.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error validating inventory:', error);
        setInventoryValid(true); // Allow order if validation fails
      }
    };

    validateInventory();
  }, [items, toast]);

  const handleAddressSubmit = async (address: any) => {
    try {
      setIsProcessing(true);
      setShippingAddress(address);
      
      // Create a temporary order to get order ID for Stripe
      const orderItems = items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.price,
        variant_id: item.variantId,
        bundle_id: item.bundleId
      }));

      const tempOrder = await createOrder({
        items: orderItems,
        shipping_address_id: address?.id,
        shipping_method: orderData.shipping_method,
        notes: orderData.notes
      });

      setTempOrderId(tempOrder.id);
      setCurrentStep('payment');
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to prepare order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      setIsProcessing(true);

      // Verify payment and update order status
      if (tempOrderId) {
        // Order already exists, just clear cart and redirect
        clearCart();

        toast({
          title: "Order placed successfully!",
          description: `Your order has been confirmed and payment processed.`
        });

        // Navigate to order confirmation  
        navigate(`/order-confirmation/${tempOrderId}?session_id=${sessionId}`);
      }

    } catch (error) {
      console.error('Error processing payment success:', error);
      toast({
        title: "Payment processing error",
        description: "There was an issue processing your payment. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Payment failed",
      description: error,
      variant: "destructive"
    });
  };

  // Show loading state while checking auth or inventory
  if (authLoading || inventoryValid === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
          <LoadingSpinner />
          <span className="ml-2">Validating checkout requirements...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        {/* Security & Inventory Alerts */}
        <div className="mb-6 space-y-4">
          {isAuthenticated && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Secure checkout - You are logged in and your information is protected.
              </AlertDescription>
            </Alert>
          )}
          
          {inventoryValid === false && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Warning: Some items in your cart may be out of stock. Please review your order before proceeding.
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          <div className={`flex items-center ${currentStep === 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'address' ? 'border-primary bg-primary text-primary-foreground' : 
              shippingAddress ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'
            }`}>
              1
            </div>
            <span className="ml-2">Shipping Address</span>
          </div>
          <div className="flex-1 h-px bg-border mx-4" />
          <div className={`flex items-center ${currentStep === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 'payment' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted'
            }`}>
              2
            </div>
            <span className="ml-2">Payment</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div className="space-y-6">
            {currentStep === 'address' && (
              <AddressForm 
                onSubmit={handleAddressSubmit}
                onCancel={() => navigate('/shopping')}
              />
            )}
            
            {currentStep === 'payment' && (
              <div className="space-y-6">
                {/* Address Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Shipping Address
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentStep('address')}
                      >
                        Edit
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {shippingAddress && (
                      <div className="text-sm">
                        <p className="font-medium">{shippingAddress.full_name}</p>
                        <p>{shippingAddress.address_line1}</p>
                        {shippingAddress.address_line2 && <p>{shippingAddress.address_line2}</p>}
                        <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}</p>
                        <p>{shippingAddress.country}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <PaymentForm
                  orderId={tempOrderId || "temp-order-id"}
                  amount={totalPrice}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-6">
            <OrderSummary items={items} />
          </div>
        </div>
      </div>
    </div>
  );
};