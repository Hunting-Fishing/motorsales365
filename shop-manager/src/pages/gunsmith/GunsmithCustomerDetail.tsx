import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Crosshair, 
  FileText, 
  Wrench,
  Calendar,
  CreditCard,
  Edit,
  AlertTriangle,
  Plus,
  KeyRound
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { EditGunsmithCustomerDialog } from '@/components/gunsmith/EditGunsmithCustomerDialog';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

export default function GunsmithCustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch customer details
  const { data: customer, isLoading: customerLoading, refetch: refetchCustomer } = useQuery({
    queryKey: ['gunsmith-customer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  // Fetch customer's firearms
  const { data: firearms, isLoading: firearmsLoading } = useQuery({
    queryKey: ['gunsmith-customer-firearms', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gunsmith_firearms')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  // Fetch customer's jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['gunsmith-customer-jobs', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gunsmith_jobs')
        .select('*, gunsmith_firearms(make, model)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  // Fetch customer's quotes
  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['gunsmith-customer-quotes', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gunsmith_quotes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  // Fetch customer's invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['gunsmith-customer-invoices', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gunsmith_invoices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  // Fetch customer's appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['gunsmith-customer-appointments', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gunsmith_appointments')
        .select('*')
        .eq('customer_id', customerId)
        .order('appointment_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  if (!customerId) {
    return (
      <MobilePageContainer>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Invalid customer ID.</AlertDescription>
        </Alert>
      </MobilePageContainer>
    );
  }

  if (customerLoading) {
    return (
      <MobilePageContainer>
        <div className="space-y-4 md:space-y-6">
          <Skeleton className="h-10 md:h-12 w-48 md:w-64" />
          <Skeleton className="h-32 md:h-48 w-full" />
          <Skeleton className="h-64 md:h-96 w-full" />
        </div>
      </MobilePageContainer>
    );
  }

  if (!customer) {
    return (
      <MobilePageContainer>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Customer not found.</AlertDescription>
        </Alert>
      </MobilePageContainer>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'in_progress': case 'in progress': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-700 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title={`${customer.first_name} ${customer.last_name}`}
        subtitle="Customer Details"
        icon={<User className="h-6 w-6 md:h-8 md:w-8 text-amber-600 shrink-0" />}
        onBack={() => navigate('/gunsmith/customers')}
        actions={
          <Button onClick={() => setEditDialogOpen(true)} className="bg-amber-600 hover:bg-amber-700" size="sm">
            <Edit className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Edit </span>Customer
          </Button>
        }
      />

      {/* Customer Info Card */}
      <Card className="mb-4 md:mb-6">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <User className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {customer.phone && (
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm md:text-base truncate">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm md:text-base truncate">{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-2 sm:col-span-2 min-w-0">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-sm md:text-base break-words">{customer.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground shrink-0" />
              {customer.user_id ? (
                <Badge className="bg-green-100 text-green-800 text-xs">Portal Access</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs">No Portal</Badge>
              )}
            </div>
          </div>
          {customer.notes && (
            <div className="mt-3 md:mt-4 p-2 md:p-3 bg-muted/50 rounded-lg">
              <p className="text-xs md:text-sm text-muted-foreground">{customer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for related data */}
      <Tabs defaultValue="firearms" className="space-y-3 md:space-y-4">
        <TabsList className="flex w-full overflow-x-auto gap-1 pb-1 scrollbar-hide h-auto p-1">
          <TabsTrigger value="firearms" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <Crosshair className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Firearms</span>
            <span>({firearms?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <Wrench className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Jobs</span>
            <span>({jobs?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Quotes</span>
            <span>({quotes?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Invoices</span>
            <span>({invoices?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <Calendar className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Appts</span>
            <span>({appointments?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* Firearms Tab */}
        <TabsContent value="firearms">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Registered Firearms</CardTitle>
              <Button 
                size="sm" 
                onClick={() => navigate(`/gunsmith/firearms/new?customer=${customerId}`)}
                className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Firearm
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {firearmsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 md:h-16 w-full" />)}
                </div>
              ) : firearms?.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 md:py-8 text-sm md:text-base">No firearms registered</p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {firearms?.map((firearm) => (
                    <div 
                      key={firearm.id}
                      className="p-3 md:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/gunsmith/firearms/${firearm.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base block truncate">{firearm.make} {firearm.model}</span>
                          <div className="text-xs md:text-sm text-muted-foreground truncate">
                            {firearm.firearm_type} - S/N: {firearm.serial_number}
                          </div>
                        </div>
                        <Badge variant="outline" className="self-start sm:self-auto text-xs">{firearm.caliber}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Service Jobs</CardTitle>
              <Button 
                size="sm" 
                onClick={() => navigate(`/gunsmith/jobs/new?customer=${customerId}`)}
                className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Job
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {jobsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 md:h-16 w-full" />)}
                </div>
              ) : jobs?.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 md:py-8 text-sm md:text-base">No jobs found</p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {jobs?.map((job) => (
                    <div 
                      key={job.id}
                      className="p-3 md:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/gunsmith/jobs/${job.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base">{job.job_number}</span>
                          <div className="text-xs md:text-sm text-muted-foreground truncate">
                            {job.gunsmith_firearms?.make} {job.gunsmith_firearms?.model} - {job.job_type}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {format(new Date(job.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Quotes</CardTitle>
              <Button 
                size="sm" 
                onClick={() => navigate(`/gunsmith/quotes/new?customer=${customerId}`)}
                className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Quote
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {quotesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 md:h-16 w-full" />)}
                </div>
              ) : quotes?.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 md:py-8 text-sm md:text-base">No quotes found</p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {quotes?.map((quote) => (
                    <div 
                      key={quote.id}
                      className="p-3 md:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/gunsmith/quotes/${quote.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base">{quote.quote_number}</span>
                          <div className="text-xs md:text-sm text-muted-foreground truncate">
                            {quote.description || 'No description'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(quote.status)}>{quote.status}</Badge>
                          <span className="font-medium text-sm md:text-base">${quote.total?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Invoices</CardTitle>
              <Button 
                size="sm" 
                onClick={() => navigate(`/gunsmith/invoices/new?customer=${customerId}`)}
                className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Invoice
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {invoicesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 md:h-16 w-full" />)}
                </div>
              ) : invoices?.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 md:py-8 text-sm md:text-base">No invoices found</p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {invoices?.map((invoice) => (
                    <div 
                      key={invoice.id}
                      className="p-3 md:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/gunsmith/invoices/${invoice.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base">{invoice.invoice_number}</span>
                          <div className="text-xs md:text-sm text-muted-foreground">
                            {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                          <span className="font-medium text-sm md:text-base">${invoice.total?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Appointments</CardTitle>
              <Button 
                size="sm" 
                onClick={() => navigate(`/gunsmith/appointments/new?customer=${customerId}`)}
                className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {appointmentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 md:h-16 w-full" />)}
                </div>
              ) : appointments?.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 md:py-8 text-sm md:text-base">No appointments found</p>
              ) : (
                <div className="space-y-2 md:space-y-3">
                  {appointments?.map((apt) => (
                    <div 
                      key={apt.id}
                      className="p-3 md:p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base">{apt.appointment_type}</span>
                          <div className="text-xs md:text-sm text-muted-foreground">
                            {format(new Date(apt.appointment_date), 'MMM d, yyyy')} at {apt.appointment_time}
                          </div>
                        </div>
                        <Badge className={getStatusColor(apt.status)}>{apt.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <EditGunsmithCustomerDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) refetchCustomer();
        }}
        customer={customer}
        onSave={() => refetchCustomer()}
      />
    </MobilePageContainer>
  );
}