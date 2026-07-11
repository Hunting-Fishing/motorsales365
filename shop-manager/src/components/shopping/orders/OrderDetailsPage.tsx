import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getOrderById, cancelOrder } from '@/services/orderService';
import { Order } from '@/types/order';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft, Package, CreditCard, Truck, MapPin } from 'lucide-react';

export const OrderDetailsPage = () => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId]);

  const loadOrder = async (id: string) => {
    try {
      const orderData = await getOrderById(id);
      if (!orderData) {
        toast({
          title: "Order not found",
          description: "The order you're looking for doesn't exist.",
          variant: "destructive"
        });
        navigate('/orders');
        return;
      }
      setOrder(orderData);
    } catch (error) {
      console.error('Error loading order:', error);
      toast({
        title: "Error loading order",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || cancelling) return;
    
    try {
      setCancelling(true);
      const updatedOrder = await cancelOrder(order.id);
      setOrder(updatedOrder);
      
      toast({
        title: "Order cancelled",
        description: "Your order has been cancelled successfully."
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error cancelling order",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'shipped': return 'outline';
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      case 'refunded': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'unpaid': return 'secondary';
      case 'partially_paid': return 'outline';
      case 'refunded': return 'destructive';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold mb-2">Order not found</h3>
        <p className="text-muted-foreground mb-6">
          The order you're looking for doesn't exist.
        </p>
        <Button onClick={() => navigate('/orders')}>
          View All Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">
              Placed on {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-3 border-b last:border-b-0">
                    {item.product?.image_url && (
                      <img 
                        src={item.product.image_url} 
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.product?.sku || 'N/A'}
                      </p>
                      <p className="text-sm">
                        Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${item.total_price.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Payment:</span>
                  <Badge variant={getPaymentStatusBadgeVariant(order.payment_status)}>
                    {order.payment_status.replace('_', ' ').charAt(0).toUpperCase() + 
                     order.payment_status.replace('_', ' ').slice(1)}
                  </Badge>
                </div>
                {order.shipping_method && (
                  <div className="flex justify-between items-center">
                    <span>Shipping:</span>
                    <span className="capitalize">{order.shipping_method}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Order Total
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${order.total_amount.toFixed(2)}</span>
                </div>
                {order.shipping_cost && order.shipping_cost > 0 && (
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>${order.shipping_cost.toFixed(2)}</span>
                  </div>
                )}
                {order.tax_amount && order.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${order.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${order.total_amount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {order.status === 'pending' && (
              <Card>
                <CardContent className="pt-6">
                  <Button 
                    variant="destructive" 
                    onClick={handleCancelOrder}
                    disabled={cancelling}
                    className="w-full"
                  >
                    {cancelling ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Cancelling...
                      </>
                    ) : (
                      'Cancel Order'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};