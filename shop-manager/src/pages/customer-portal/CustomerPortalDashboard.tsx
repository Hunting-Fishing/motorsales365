import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, User, Crosshair, Wrench, FileText, Phone, Mail, MapPin } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';

interface CustomerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface Firearm {
  id: string;
  make: string;
  model: string;
  serial_number: string;
  caliber?: string;
  firearm_type?: string;
}

interface Job {
  id: string;
  job_number: string;
  description: string;
  status: string;
  created_at: string;
  estimated_completion?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  created_at: string;
  due_date?: string;
}

export default function CustomerPortalDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyName } = useCompany();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [firearms, setFirearms] = useState<Firearm[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    checkAuthAndLoadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/customer-portal/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/customer-portal/login');
        return;
      }

      // Get customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (customerError || !customerData) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "No customer account found for this user.",
          variant: "destructive"
        });
        navigate('/customer-portal/login');
        return;
      }

      setCustomer(customerData);

      // Load firearms
      const { data: firearmsData } = await supabase
        .from('gunsmith_firearms')
        .select('id, make, model, serial_number, caliber, firearm_type')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      setFirearms(firearmsData || []);

      // Load jobs
      const { data: jobsData } = await supabase
        .from('gunsmith_jobs')
        .select('id, job_number, description, status, created_at, estimated_completion')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      setJobs(jobsData || []);

      // Load invoices - map 'id' as invoice_number since that column doesn't exist
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, total, status, created_at, due_date')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      // Map the data to include invoice_number
      const mappedInvoices = (invoicesData || []).map((inv: any) => ({
        ...inv,
        invoice_number: `INV-${inv.id.slice(0, 8).toUpperCase()}`
      }));
      setInvoices(mappedInvoices);

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
    navigate('/customer-portal/login');
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('complete') || statusLower.includes('paid')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('progress') || statusLower.includes('pending')) return 'bg-amber-100 text-amber-800';
    if (statusLower.includes('cancel') || statusLower.includes('overdue')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-amber-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
              <Crosshair className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-amber-900">{companyName || 'Customer Portal'}</h1>
              <p className="text-sm text-muted-foreground">Welcome, {customer.first_name}!</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="border-amber-200">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="bg-white border border-amber-200">
            <TabsTrigger value="account" className="data-[state=active]:bg-amber-100">
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger value="firearms" className="data-[state=active]:bg-amber-100">
              <Crosshair className="h-4 w-4 mr-2" />
              Firearms ({firearms.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="data-[state=active]:bg-amber-100">
              <Wrench className="h-4 w-4 mr-2" />
              Work Orders ({jobs.length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-amber-100">
              <FileText className="h-4 w-4 mr-2" />
              Invoices ({invoices.length})
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account">
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-900">Account Information</CardTitle>
                <CardDescription>Your registered account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                    <User className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{customer.first_name} {customer.last_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                    <Mail className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{customer.email}</p>
                    </div>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                      <Phone className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{customer.phone}</p>
                      </div>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-amber-600" />
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

          {/* Firearms Tab */}
          <TabsContent value="firearms">
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-900">Registered Firearms</CardTitle>
                <CardDescription>Firearms registered to your account</CardDescription>
              </CardHeader>
              <CardContent>
                {firearms.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No firearms registered yet.</p>
                ) : (
                  <div className="space-y-3">
                    {firearms.map((firearm) => (
                      <div key={firearm.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <Crosshair className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="font-medium">{firearm.make} {firearm.model}</p>
                            <p className="text-sm text-muted-foreground">
                              S/N: {firearm.serial_number}
                              {firearm.caliber && ` • ${firearm.caliber}`}
                            </p>
                          </div>
                        </div>
                        {firearm.firearm_type && (
                          <Badge variant="outline" className="border-amber-300">
                            {firearm.firearm_type}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-900">Work Orders</CardTitle>
                <CardDescription>Your service requests and repair status</CardDescription>
              </CardHeader>
              <CardContent>
                {jobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No work orders found.</p>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <Wrench className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="font-medium">{job.job_number}</p>
                            <p className="text-sm text-muted-foreground">{job.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created: {new Date(job.created_at).toLocaleDateString()}
                              {job.estimated_completion && ` • Est. completion: ${new Date(job.estimated_completion).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="text-amber-900">Invoices</CardTitle>
                <CardDescription>Your billing history and outstanding invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No invoices found.</p>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <FileText className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-sm text-muted-foreground">
                              ${invoice.total?.toFixed(2) || '0.00'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Date: {new Date(invoice.created_at).toLocaleDateString()}
                              {invoice.due_date && ` • Due: ${new Date(invoice.due_date).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
