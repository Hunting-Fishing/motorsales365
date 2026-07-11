import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Calendar, 
  FileText, 
  Camera, 
  Repeat,
  LogOut,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PortalSession {
  customer_id: string;
  customer_name: string;
  customer_email: string;
}

export default function PowerWashingCustomerPortal() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<PortalSession | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if customer exists with this email - using any to avoid deep type instantiation
      const result = await (supabase as any)
        .from('power_washing_customer_portal')
        .select('*, customers(*)')
        .eq('customer_email', email.toLowerCase())
        .eq('is_active', true)
        .single();
      
      const portal = result.data;
      const error = result.error;

      if (error || !portal) {
        toast({
          title: 'Access Denied',
          description: 'No active portal access found for this email.',
          variant: 'destructive'
        });
        return;
      }

      // Set session
      setSession({
        customer_id: portal.customer_id,
        customer_name: portal.customers?.first_name + ' ' + (portal.customers?.last_name || ''),
        customer_email: email
      });

      // Load customer data
      await loadCustomerData(portal.customer_id);

      toast({
        title: 'Welcome!',
        description: 'You are now logged in to your customer portal.'
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Error',
        description: 'Failed to log in. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomerData = async (customerId: string) => {
    // Load jobs
    const { data: jobsData } = await supabase
      .from('power_washing_jobs')
      .select('*')
      .eq('customer_id', customerId)
      .order('scheduled_date', { ascending: false })
      .limit(10);
    setJobs(jobsData || []);

    // Load invoices
    const { data: invoicesData } = await supabase
      .from('power_washing_invoices')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);
    setInvoices(invoicesData || []);

    // Load subscriptions
    const { data: subsData } = await supabase
      .from('power_washing_recurring_schedules')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_active', true) as { data: any[] | null };
    setSubscriptions(subsData || []);
  };

  const handleLogout = () => {
    setSession(null);
    setEmail('');
    setJobs([]);
    setInvoices([]);
    setSubscriptions([]);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Customer Portal</CardTitle>
            <p className="text-muted-foreground">Enter your email to access your account</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Checking...' : 'Access Portal'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            Welcome, {session.customer_name}
          </h1>
          <p className="text-muted-foreground mt-1">{session.customer_email}</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Your Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No jobs found</p>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{job.job_number}</p>
                        <p className="text-sm text-muted-foreground">{job.property_address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {job.scheduled_date ? format(new Date(job.scheduled_date), 'MMM d, yyyy') : 'TBD'}
                        </p>
                        <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                          {job.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Your Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No invoices found</p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(invoice.issue_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${invoice.total?.toFixed(2)}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Your Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No active subscriptions</p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{sub.schedule_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {sub.frequency} service
                        </p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
