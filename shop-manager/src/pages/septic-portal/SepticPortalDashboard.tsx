import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Container, LogOut, User, ClipboardCheck, Droplet, FileText, 
  Calendar, MapPin, Phone, Mail, Loader2, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface CustomerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
}

interface Tank {
  id: string;
  tank_type: string;
  tank_size_gallons: number | null;
  location_address: string | null;
  system_status: string | null;
  last_pump_date: string | null;
  next_pump_due: string | null;
  installation_date: string | null;
  permit_number: string | null;
}

interface ServiceOrder {
  id: string;
  order_number: string | null;
  service_type: string;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  total: number | null;
  payment_status: string | null;
  location_address: string | null;
  gallons_pumped: number | null;
}

interface Inspection {
  id: string;
  inspection_type: string | null;
  inspection_date: string | null;
  pass_fail: string | null;
  overall_condition: string | null;
  notes: string | null;
  next_inspection_due: string | null;
}

export default function SepticPortalDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  useEffect(() => {
    checkAuthAndLoadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/septic-portal/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/septic-portal/login');
        return;
      }

      // Get customer data
      const { data: customerData, error: customerError } = await (supabase as any)
        .from('septic_customers')
        .select('id, first_name, last_name, email, phone, address')
        .eq('user_id', session.user.id)
        .single();

      if (customerError || !customerData) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "No customer account found for this user.",
          variant: "destructive"
        });
        navigate('/septic-portal/login');
        return;
      }

      setCustomer(customerData);

      // Load tanks
      const { data: tanksData } = await supabase
        .from('septic_tanks')
        .select('id, tank_type, tank_size_gallons, location_address, system_status, last_pump_date, next_pump_due, installation_date, permit_number')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      setTanks(tanksData || []);

      // Load service orders
      const { data: ordersData } = await supabase
        .from('septic_service_orders')
        .select('id, order_number, service_type, status, scheduled_date, completed_date, total, payment_status, location_address, gallons_pumped')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setServiceOrders(ordersData || []);

      // Load inspections via tanks
      if (tanksData && tanksData.length > 0) {
        const tankIds = tanksData.map(t => t.id);
        const { data: inspectionsData } = await supabase
          .from('septic_inspections')
          .select('id, inspection_type, inspection_date, pass_fail, overall_condition, notes, next_inspection_due')
          .in('tank_id', tankIds)
          .order('inspection_date', { ascending: false })
          .limit(20);

        setInspections(inspectionsData || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to load your account data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/septic-portal/login');
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('complete') || s.includes('paid') || s.includes('pass') || s.includes('good') || s.includes('active')) 
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (s.includes('progress') || s.includes('pending') || s.includes('scheduled') || s.includes('fair')) 
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    if (s.includes('cancel') || s.includes('overdue') || s.includes('fail') || s.includes('poor') || s.includes('critical')) 
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-stone-600" />
      </div>
    );
  }

  if (!customer) return null;

  const upcomingPumpOuts = tanks.filter(t => t.next_pump_due && new Date(t.next_pump_due) > new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-700 rounded-lg flex items-center justify-center">
              <Container className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold">Septic Services Portal</h1>
              <p className="text-sm text-muted-foreground">Welcome, {customer.first_name}!</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Alerts */}
      {upcomingPumpOuts.length > 0 && (
        <div className="container mx-auto px-4 pt-4">
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-700/40">
            <CardContent className="py-3 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You have {upcomingPumpOuts.length} tank{upcomingPumpOuts.length > 1 ? 's' : ''} with upcoming pump-out{upcomingPumpOuts.length > 1 ? 's' : ''} scheduled.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="tanks" className="space-y-6">
          <TabsList className="bg-card border border-border/50">
            <TabsTrigger value="tanks">
              <Container className="h-4 w-4 mr-2" />
              Tanks ({tanks.length})
            </TabsTrigger>
            <TabsTrigger value="services">
              <Droplet className="h-4 w-4 mr-2" />
              Services ({serviceOrders.length})
            </TabsTrigger>
            <TabsTrigger value="inspections">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Inspections ({inspections.length})
            </TabsTrigger>
            <TabsTrigger value="account">
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>

          {/* Tanks Tab */}
          <TabsContent value="tanks">
            <div className="space-y-4">
              {tanks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Container className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>No septic tanks registered to your account yet.</p>
                    <p className="text-sm mt-1">Contact your service provider to register your system.</p>
                  </CardContent>
                </Card>
              ) : (
                tanks.map((tank) => (
                  <Card key={tank.id} className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Container className="h-5 w-5 text-stone-600" />
                          {tank.tank_type} Tank
                          {tank.tank_size_gallons && ` — ${tank.tank_size_gallons} gal`}
                        </CardTitle>
                        {tank.system_status && (
                          <Badge className={getStatusColor(tank.system_status)}>
                            {tank.system_status}
                          </Badge>
                        )}
                      </div>
                      {tank.location_address && (
                        <CardDescription className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {tank.location_address}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {tank.last_pump_date && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Last Pump-Out</p>
                            <p className="font-medium text-sm">{format(new Date(tank.last_pump_date), 'MMM d, yyyy')}</p>
                          </div>
                        )}
                        {tank.next_pump_due && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Next Pump Due</p>
                            <p className="font-medium text-sm">{format(new Date(tank.next_pump_due), 'MMM d, yyyy')}</p>
                          </div>
                        )}
                        {tank.installation_date && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Installed</p>
                            <p className="font-medium text-sm">{format(new Date(tank.installation_date), 'MMM d, yyyy')}</p>
                          </div>
                        )}
                        {tank.permit_number && (
                          <div className="bg-muted/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Permit #</p>
                            <p className="font-medium text-sm">{tank.permit_number}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Service Orders Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>Service History</CardTitle>
                <CardDescription>Your pump-outs, repairs, and maintenance records</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No service orders found.</p>
                ) : (
                  <div className="space-y-3">
                    {serviceOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{order.order_number || `ORD-${order.id.slice(0, 8).toUpperCase()}`}</p>
                            <Badge variant="outline" className="text-xs capitalize">
                              {order.service_type}
                            </Badge>
                          </div>
                          {order.location_address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {order.location_address}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {order.scheduled_date ? format(new Date(order.scheduled_date), 'MMM d, yyyy') : 'Not scheduled'}
                            {order.gallons_pumped ? ` • ${order.gallons_pumped} gallons pumped` : ''}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          {order.total != null && (
                            <p className="text-sm font-medium">${order.total.toFixed(2)}</p>
                          )}
                          {order.payment_status && (
                            <Badge variant="outline" className="text-xs">
                              {order.payment_status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Reports</CardTitle>
                <CardDescription>Compliance inspections and system assessments</CardDescription>
              </CardHeader>
              <CardContent>
                {inspections.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No inspections found.</p>
                ) : (
                  <div className="space-y-3">
                    {inspections.map((inspection) => (
                      <div key={inspection.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium capitalize">{inspection.inspection_type || 'Inspection'}</p>
                          <p className="text-sm text-muted-foreground">
                            {inspection.inspection_date ? format(new Date(inspection.inspection_date), 'MMM d, yyyy') : 'Date pending'}
                          </p>
                          {inspection.notes && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{inspection.notes}</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          {inspection.pass_fail && (
                            <Badge className={getStatusColor(inspection.pass_fail)}>
                              {inspection.pass_fail}
                            </Badge>
                          )}
                          {inspection.overall_condition && (
                            <p className="text-xs text-muted-foreground capitalize">
                              Condition: {inspection.overall_condition}
                            </p>
                          )}
                          {inspection.next_inspection_due && (
                            <p className="text-xs text-muted-foreground">
                              Next: {format(new Date(inspection.next_inspection_due), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your registered account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <User className="h-5 w-5 text-stone-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                    <Mail className="h-5 w-5 text-stone-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Phone className="h-5 w-5 text-stone-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{customer.phone}</p>
                      </div>
                    </div>
                  )}
                  {customer.company && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Container className="h-5 w-5 text-stone-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{customer.company}</p>
                      </div>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg md:col-span-2">
                      <MapPin className="h-5 w-5 text-stone-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{customer.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
