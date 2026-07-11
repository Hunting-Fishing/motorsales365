import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Car, LogOut, User, Wrench, FileText, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  license_plate: string | null;
  color: string | null;
  last_service_date: string | null;
}

interface WorkOrder {
  id: string;
  work_order_number: string | null;
  status: string;
  description: string | null;
  service_type: string | null;
  total_cost: number | null;
  created_at: string;
  start_time: string | null;
  end_time: string | null;
  vehicle_id: string | null;
}

export default function AutomotivePortalDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    loadData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/automotive-portal/login');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/automotive-portal/login'); return; }

      const { data: customerData, error: custErr } = await supabase
        .from('customers').select('id, first_name, last_name, email, phone, address')
        .eq('user_id', session.user.id).single();
      if (custErr || !customerData) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "No customer account found.", variant: "destructive" });
        navigate('/automotive-portal/login'); return;
      }
      setCustomer(customerData);

      const { data: vehiclesData } = await supabase
        .from('vehicles').select('id, make, model, year, vin, license_plate, color, last_service_date')
        .eq('customer_id', customerData.id).order('created_at', { ascending: false });
      setVehicles(vehiclesData || []);

      const { data: ordersData } = await supabase
        .from('work_orders').select('id, work_order_number, status, description, service_type, total_cost, created_at, start_time, end_time, vehicle_id')
        .eq('customer_id', customerData.id).order('created_at', { ascending: false }).limit(25);
      setWorkOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({ title: "Error", description: "Failed to load account data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/automotive-portal/login'); };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('complete') || s.includes('paid') || s.includes('closed')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (s.includes('progress') || s.includes('pending') || s.includes('open')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    if (s.includes('cancel') || s.includes('overdue')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-muted text-muted-foreground';
  };

  const getVehicleLabel = (vehicleId: string | null) => {
    if (!vehicleId) return null;
    const v = vehicles.find(v => v.id === vehicleId);
    return v ? `${v.year || ''} ${v.make || ''} ${v.model || ''}`.trim() : null;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
  if (!customer) return null;

  const activeOrders = workOrders.filter(o => !['completed','closed','cancelled'].includes(o.status?.toLowerCase() || ''));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold">Automotive Service Portal</h1>
              <p className="text-sm text-muted-foreground">Welcome, {customer.first_name}!</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Sign Out</Button>
        </div>
      </header>

      {activeOrders.length > 0 && (
        <div className="container mx-auto px-4 pt-4">
          <Card className="border-blue-300 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-700/40">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                You have {activeOrders.length} active work order{activeOrders.length > 1 ? 's' : ''} in progress.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="vehicles" className="space-y-6">
          <TabsList className="bg-card border border-border/50">
            <TabsTrigger value="vehicles"><Car className="h-4 w-4 mr-2" />Vehicles ({vehicles.length})</TabsTrigger>
            <TabsTrigger value="orders"><Wrench className="h-4 w-4 mr-2" />Work Orders ({workOrders.length})</TabsTrigger>
            <TabsTrigger value="account"><User className="h-4 w-4 mr-2" />Account</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles">
            <div className="space-y-4">
              {vehicles.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No vehicles registered to your account yet.</p>
                  <p className="text-sm mt-1">Contact your service provider to add your vehicles.</p>
                </CardContent></Card>
              ) : vehicles.map((v) => (
                <Card key={v.id} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Car className="h-5 w-5 text-blue-600" />
                        {v.year} {v.make} {v.model}
                      </CardTitle>
                      {v.color && <Badge variant="outline">{v.color}</Badge>}
                    </div>
                    {v.license_plate && <CardDescription>Plate: {v.license_plate}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {v.vin && <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">VIN</p><p className="font-medium text-sm font-mono">{v.vin}</p></div>}
                      {v.last_service_date && <div className="bg-muted/50 rounded-lg p-3"><p className="text-xs text-muted-foreground">Last Service</p><p className="font-medium text-sm">{format(new Date(v.last_service_date), 'MMM d, yyyy')}</p></div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader><CardTitle>Work Orders</CardTitle><CardDescription>Your repair and service history</CardDescription></CardHeader>
              <CardContent>
                {workOrders.length === 0 ? <p className="text-center text-muted-foreground py-8">No work orders found.</p> : (
                  <div className="space-y-3">
                    {workOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{order.work_order_number || `WO-${order.id.slice(0,8).toUpperCase()}`}</p>
                            {order.service_type && <Badge variant="outline" className="text-xs capitalize">{order.service_type}</Badge>}
                          </div>
                          {order.description && <p className="text-sm text-muted-foreground line-clamp-1">{order.description}</p>}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy')}
                            {getVehicleLabel(order.vehicle_id) && ` • ${getVehicleLabel(order.vehicle_id)}`}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          {order.total_cost != null && <p className="text-sm font-medium">${order.total_cost.toFixed(2)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader><CardTitle>Account Information</CardTitle><CardDescription>Your registered account details</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <User className="h-5 w-5 text-blue-600" />
                    <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{customer.first_name} {customer.last_name}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{customer.email}</p></div>
                  </div>
                  {customer.phone && <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{customer.phone}</p></div>
                  </div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
