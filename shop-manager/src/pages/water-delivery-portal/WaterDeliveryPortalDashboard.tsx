import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, LogOut, User, Truck, FileText, Loader2, AlertCircle, Gauge } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerData { id: string; first_name: string; last_name: string; email: string; phone?: string; }
interface Tank { id: string; tank_name: string | null; capacity_gallons: number | null; current_level_gallons: number | null; current_level_percent: number | null; reorder_level_percent: number | null; tank_type: string | null; is_potable_certified: boolean | null; next_inspection_due: string | null; }
interface DeliveryOrder { id: string; order_number: string | null; status: string; quantity_gallons: number | null; total_amount: number | null; order_date: string | null; requested_date: string | null; priority: string | null; }

export default function WaterDeliveryPortalDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);

  useEffect(() => {
    loadData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/water-delivery-portal/login');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/water-delivery-portal/login'); return; }

      const { data: cust, error: custErr } = await supabase
        .from('customers').select('id, first_name, last_name, email, phone').eq('user_id', session.user.id).single();
      if (custErr || !cust) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "No customer account found.", variant: "destructive" });
        navigate('/water-delivery-portal/login'); return;
      }
      setCustomer(cust);
      const customerId = cust.id;

      const { data: tanksData } = await supabase
        .from('water_delivery_tanks').select('id, tank_name, capacity_gallons, current_level_gallons, current_level_percent, reorder_level_percent, tank_type, is_potable_certified, next_inspection_due')
        .eq('customer_id', customerId).order('created_at', { ascending: false });
      setTanks(tanksData || []);

      const { data: ordersData } = await supabase
        .from('water_delivery_orders').select('id, order_number, status, quantity_gallons, total_amount, order_date, requested_date, priority')
        .eq('customer_id', customerId).order('order_date', { ascending: false }).limit(25);
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({ title: "Error", description: "Failed to load account data", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/water-delivery-portal/login'); };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('complete') || s.includes('delivered') || s.includes('paid')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (s.includes('progress') || s.includes('pending') || s.includes('scheduled') || s.includes('transit')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    if (s.includes('cancel') || s.includes('overdue')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
    </div>
  );
  if (!customer) return null;

  const lowTanks = tanks.filter(t => t.current_level_percent != null && t.reorder_level_percent != null && t.current_level_percent <= t.reorder_level_percent);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-700 rounded-lg flex items-center justify-center"><Droplets className="h-6 w-6 text-white" /></div>
            <div><h1 className="font-bold">Water Delivery Portal</h1><p className="text-sm text-muted-foreground">Welcome, {customer.first_name}!</p></div>
          </div>
          <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Sign Out</Button>
        </div>
      </header>

      {lowTanks.length > 0 && (
        <div className="container mx-auto px-4 pt-4">
          <Card className="border-red-300 bg-red-50 dark:bg-red-900/10 dark:border-red-700/40">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300">
                {lowTanks.length} tank{lowTanks.length > 1 ? 's' : ''} below reorder level — schedule a delivery!
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="tanks" className="space-y-6">
          <TabsList className="bg-card border border-border/50">
            <TabsTrigger value="tanks"><Droplets className="h-4 w-4 mr-2" />Tanks ({tanks.length})</TabsTrigger>
            <TabsTrigger value="orders"><Truck className="h-4 w-4 mr-2" />Orders ({orders.length})</TabsTrigger>
            <TabsTrigger value="account"><User className="h-4 w-4 mr-2" />Account</TabsTrigger>
          </TabsList>

          <TabsContent value="tanks">
            <div className="space-y-4">
              {tanks.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  <Droplets className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No water tanks registered to your account yet.</p>
                  <p className="text-sm mt-1">Contact your water delivery provider to register your tanks.</p>
                </CardContent></Card>
              ) : tanks.map((tank) => {
                const levelPct = tank.current_level_percent ?? 0;
                const isLow = tank.reorder_level_percent != null && levelPct <= tank.reorder_level_percent;
                return (
                  <Card key={tank.id} className={`border-border/50 ${isLow ? 'border-red-300 dark:border-red-700/40' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Droplets className="h-5 w-5 text-cyan-600" />
                          {tank.tank_name || 'Water Tank'}
                          {tank.capacity_gallons && ` — ${tank.capacity_gallons} gal`}
                        </CardTitle>
                        {tank.is_potable_certified && <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Potable</Badge>}
                      </div>
                      {tank.tank_type && <CardDescription className="capitalize">{tank.tank_type}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" />Tank Level</span>
                          <span className={`text-sm font-medium ${isLow ? 'text-red-600' : ''}`}>{levelPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${isLow ? 'bg-red-500' : levelPct < 50 ? 'bg-amber-500' : 'bg-cyan-500'}`} style={{ width: `${Math.min(levelPct, 100)}%` }} />
                        </div>
                        {tank.current_level_gallons != null && <p className="text-xs text-muted-foreground mt-1">{tank.current_level_gallons} / {tank.capacity_gallons} gallons</p>}
                      </div>
                      {tank.next_inspection_due && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground">Next Inspection Due</p>
                          <p className="font-medium text-sm">{format(new Date(tank.next_inspection_due), 'MMM d, yyyy')}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader><CardTitle>Delivery Orders</CardTitle><CardDescription>Your water delivery history and upcoming orders</CardDescription></CardHeader>
              <CardContent>
                {orders.length === 0 ? <p className="text-center text-muted-foreground py-8">No delivery orders found.</p> : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{order.order_number || `ORD-${order.id.slice(0,8).toUpperCase()}`}</p>
                            {order.priority && <Badge variant="outline" className="text-xs capitalize">{order.priority}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.order_date ? format(new Date(order.order_date), 'MMM d, yyyy') : 'Date pending'}
                            {order.quantity_gallons ? ` • ${order.quantity_gallons} gallons` : ''}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                          {order.total_amount != null && <p className="text-sm font-medium">${order.total_amount.toFixed(2)}</p>}
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
                    <User className="h-5 w-5 text-cyan-600" /><div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium">{customer.first_name} {customer.last_name}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <FileText className="h-5 w-5 text-cyan-600" /><div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{customer.email}</p></div>
                  </div>
                  {customer.phone && <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Truck className="h-5 w-5 text-cyan-600" /><div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{customer.phone}</p></div>
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
