import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Fuel, Truck, MapPin, Clock, Plus, LogOut, 
  User, FileText, Settings, ChevronRight, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { usePortalBusinessInfo } from '@/hooks/usePortalBusinessInfo';

interface CustomerData {
  id: string;
  shop_id: string;
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  billing_address: string | null;
  preferred_fuel_type: string | null;
}

interface DeliveryRequest {
  id: string;
  requested_date: string | null;
  requested_time_window: string | null;
  fuel_type: string | null;
  estimated_gallons: number | null;
  urgency: string;
  status: string;
  created_at: string;
}

interface DeliveryOrder {
  id: string;
  order_date: string;
  status: string | null;
  product_id: string | null;
  quantity_ordered: number;
  total_amount: number | null;
}

export default function FuelDeliveryPortalDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [recentOrders, setRecentOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { data: businessInfo } = usePortalBusinessInfo(customer?.shop_id || null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      // Load customer data
      const { data: customerData, error: customerError } = await supabase
        .from('fuel_delivery_customers')
        .select('id, shop_id, company_name, contact_name, email, phone, billing_address, preferred_fuel_type')
        .eq('user_id', user.id)
        .single();

      if (customerError || !customerData) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      setCustomer(customerData);

      // Load pending requests
      const { data: requestsData } = await supabase
        .from('fuel_delivery_requests')
        .select('*')
        .eq('customer_id', customerData.id)
        .in('status', ['pending', 'approved', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(5);

      setRequests(requestsData || []);

      // Load recent orders
      const { data: ordersData } = await supabase
        .from('fuel_delivery_orders')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('order_date', { ascending: false })
        .limit(5);

      setRecentOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/fuel-delivery-portal/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'approved': 
      case 'scheduled': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Fuel className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold block">{businessInfo?.displayName || 'Fuel Delivery Portal'}</span>
              <span className="text-xs text-muted-foreground">
                {customer?.company_name || customer?.contact_name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/fuel-delivery-portal/account">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome, {customer?.contact_name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">
              Manage your fuel deliveries and account
            </p>
          </div>
          <Link to="/fuel-delivery-portal/request">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Request Delivery
            </Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/fuel-delivery-portal/request">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Fuel className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">Request Delivery</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/fuel-delivery-portal/orders">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Truck className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">Order History</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/fuel-delivery-portal/locations">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">My Locations</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/fuel-delivery-portal/account">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6 text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-sm">Account Settings</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Pending Requests */}
        {requests.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Pending Requests</CardTitle>
                <CardDescription>Your active delivery requests</CardDescription>
              </div>
              <Link to="/fuel-delivery-portal/requests">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {request.fuel_type || 'Fuel'} - {request.estimated_gallons || '?'} gallons
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.requested_date 
                            ? format(new Date(request.requested_date), 'MMM d, yyyy')
                            : 'Flexible date'}
                          {request.requested_time_window && ` • ${request.requested_time_window}`}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Deliveries</CardTitle>
              <CardDescription>Your latest fuel deliveries</CardDescription>
            </div>
            <Link to="/fuel-delivery-portal/orders">
              <Button variant="ghost" size="sm">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No deliveries yet</p>
                <p className="text-sm">Your delivery history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          Fuel Delivery - {order.quantity_ordered} gallons
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.order_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
