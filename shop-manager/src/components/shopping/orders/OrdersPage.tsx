import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getUserOrders } from '@/services/orderService';
import { Order } from '@/types/order';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Package, Eye, ShoppingBag } from 'lucide-react';

export const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const ordersData = await getUserOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error loading orders",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">My Orders</h1>
          </div>
          <Button onClick={() => navigate('/shopping')}>
            <ShoppingBag className="h-4 w-4 mr-2" />
            Continue Shopping
          </Button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">
              You haven't placed any orders yet. Start shopping to see your orders here!
            </p>
            <Button onClick={() => navigate('/shopping')}>
              Start Shopping
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg">
                          Order #{order.id.slice(0, 8)}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                        <Badge variant={getPaymentStatusBadgeVariant(order.payment_status)}>
                          {order.payment_status.replace('_', ' ').charAt(0).toUpperCase() + 
                           order.payment_status.replace('_', ' ').slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Order Date:</span>
                          <br />
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Items:</span>
                          <br />
                          {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </div>
                        <div>
                          <span className="font-medium">Total:</span>
                          <br />
                          <span className="text-lg font-semibold text-foreground">
                            ${order.total_amount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-2">
                            {order.items.slice(0, 3).map((item) => (
                              <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1">
                                {item.product?.image_url && (
                                  <img 
                                    src={item.product.image_url} 
                                    alt={item.product.name}
                                    className="w-6 h-6 object-cover rounded"
                                  />
                                )}
                                <span className="text-sm">
                                  {item.product?.name} x{item.quantity}
                                </span>
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                +{order.items.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};