import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Truck, CreditCard } from 'lucide-react';
import { getOrderById, updateOrder } from '@/services/orderService';
import { verifyCheckoutSession } from '@/services/payment/stripeService';
import { Order } from '@/types/order';
import LoadingSkeleton from '@/components/shopping/LoadingSkeleton';
import { useToast } from '@/hooks/use-toast';

const OrderConfirmation = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadOrderAndVerifyPayment = async () => {
      if (!orderId) return;

      try {
        setLoading(true);

        // Load order details
        const orderData = await getOrderById(orderId);
        setOrder(orderData);

        // Verify payment if session ID is provided
        if (sessionId) {
          try {
            const verification = await verifyCheckoutSession(sessionId);
            setPaymentVerified(verification.status === 'paid');
            
            if (verification.status === 'paid') {
              // Update order status to paid
              await updateOrder(orderId, {
                status: 'processing',
                payment_status: 'paid'
              });
              
              toast({
                title: "Payment Confirmed",
                description: "Your payment has been successfully processed.",
              });
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast({
              title: "Payment Verification",
              description: "Could not verify payment status, but your order has been recorded.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Error loading order:', error);
        toast({
          title: "Error",
          description: "Failed to load order details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadOrderAndVerifyPayment();
  }, [orderId, sessionId, toast]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order not found</h2>
            <p className="text-muted-foreground mb-4">
              We couldn't find the order you're looking for.
            </p>
            <Button asChild>
              <Link to="/shopping">Continue Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            Order Confirmed!
          </h1>
          <p className="text-muted-foreground">
            Thank you for your purchase. Your order has been received and is being processed.
          </p>
        </div>

        {/* Order Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="font-medium">Order Number:</span>
                <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className="capitalize">{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Order Date:</span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${order.total_amount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {paymentVerified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">Payment Confirmed</span>
                  </>
                ) : (
                  <>
                    <div className="h-5 w-5 rounded-full bg-yellow-500" />
                    <span className="text-yellow-600 font-medium">Payment Processing</span>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {paymentVerified 
                  ? "Your payment has been successfully processed."
                  : "Your payment is being processed and will be confirmed shortly."
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  {item.product?.image_url && (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product?.name || 'Product'}</h3>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} × ${item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.total_price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">📦</div>
                <h3 className="font-medium mb-1">Processing</h3>
                <p className="text-sm text-muted-foreground">
                  We're preparing your order for shipment
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">🚚</div>
                <h3 className="font-medium mb-1">Shipping</h3>
                <p className="text-sm text-muted-foreground">
                  You'll receive tracking information via email
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">✅</div>
                <h3 className="font-medium mb-1">Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Your order will arrive within 3-5 business days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <Button asChild>
            <Link to="/account/orders">View All Orders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/shopping">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;