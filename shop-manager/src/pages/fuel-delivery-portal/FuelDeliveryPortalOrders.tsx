import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Loader2, Fuel, ArrowLeft, Truck, Search, Calendar, FileText 
} from 'lucide-react';
import { format } from 'date-fns';

interface DeliveryOrder {
  id: string;
  order_date: string;
  status: string | null;
  product_id: string | null;
  quantity_ordered: number;
  total_amount: number | null;
  internal_notes: string | null;
}

export default function FuelDeliveryPortalOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      // Get customer ID
      const { data: customer } = await supabase
        .from('fuel_delivery_customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      // Load orders
      const { data: ordersData, error } = await supabase
        .from('fuel_delivery_orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'confirmed':
      case 'scheduled': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'in_progress': 
      case 'out_for_delivery': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'completed': 
      case 'delivered': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase();
    return (
      order.status.toLowerCase().includes(query) ||
      format(new Date(order.order_date), 'MMM d, yyyy').toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/fuel-delivery-portal/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Fuel className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">My Orders</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {orders.length === 0 
                  ? "No orders yet. Request your first delivery!"
                  : "No orders match your search."}
              </p>
              {orders.length === 0 && (
                <Link to="/fuel-delivery-portal/request">
                  <Button className="mt-4 bg-primary hover:bg-primary/90">
                    Request Delivery
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <Truck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">
                          Fuel Delivery
                        </h3>
                        <Badge className={getStatusColor(order.status || 'pending')}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(order.order_date), 'MMM d, yyyy')}
                        </span>
                        <span>
                          {order.quantity_ordered} gallons
                        </span>
                        </div>
                      {order.internal_notes && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {order.internal_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {order.total_amount && order.total_amount > 0 && (
                        <p className="font-semibold text-lg">
                          ${order.total_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
