import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Edit,
  AlertTriangle,
  Plus,
  Briefcase,
  Receipt,
  Save,
  X,
  History,
  Clock,
  Loader2,
  Building,
  MessageSquare,
  ExternalLink,
  Ruler
} from 'lucide-react';
import { MiniMapPreview } from '@/components/shared/MiniMapPreview';
import { AddressAutocomplete, AddressResult } from '@/components/shared/AddressAutocomplete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { toast } from 'sonner';
import { PropertyAreasTab } from '@/components/power-washing/PropertyAreasTab';
import { useShopId } from '@/hooks/useShopId';

interface EditData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  notes: string;
  business_type: string;
  communication_preference: string;
  latitude: number | null;
  longitude: number | null;
}

export default function PowerWashingCustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { shopId } = useShopId();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    notes: '',
    business_type: '',
    communication_preference: '',
    latitude: null,
    longitude: null
  });

  // Fetch customer details
  const { data: customer, isLoading: customerLoading, refetch: refetchCustomer } = useQuery({
    queryKey: ['power-washing-customer', customerId],
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

  // Sync edit data when customer loads
  useEffect(() => {
    if (customer) {
      setEditData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        notes: customer.notes || '',
        business_type: customer.business_type || '',
        communication_preference: customer.communication_preference || '',
        latitude: customer.latitude || null,
        longitude: customer.longitude || null
      });
    }
  }, [customer]);

  // Handle address selection from autocomplete
  const handleAddressSelect = (result: AddressResult) => {
    setEditData(prev => ({
      ...prev,
      address: result.streetAddress,
      city: result.city,
      state: result.state,
      postal_code: result.postalCode,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
  };

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditData) => {
      // Get old values for audit trail
      const oldValues = {
        first_name: customer?.first_name,
        last_name: customer?.last_name,
        phone: customer?.phone,
        email: customer?.email,
        address: customer?.address,
        city: customer?.city,
        state: customer?.state,
        postal_code: customer?.postal_code,
        notes: customer?.notes,
        business_type: customer?.business_type,
        communication_preference: customer?.communication_preference,
        latitude: customer?.latitude,
        longitude: customer?.longitude
      };

      const { error } = await supabase
        .from('customers')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          postal_code: data.postal_code || null,
          notes: data.notes || null,
          business_type: data.business_type || null,
          communication_preference: data.communication_preference || null,
          latitude: data.latitude,
          longitude: data.longitude,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) throw error;

      // Log to audit trail
      await supabase.from('audit_trail').insert([{
        resource_type: 'customers',
        resource_id: customerId,
        action: 'UPDATE',
        old_values: JSON.parse(JSON.stringify(oldValues)),
        new_values: JSON.parse(JSON.stringify(data))
      }]);
    },
    onSuccess: () => {
      toast.success('Customer updated successfully');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['power-washing-customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-history', customerId] });
    },
    onError: (error) => {
      console.error('Failed to update customer:', error);
      toast.error('Failed to update customer');
    }
  });

  // Fetch customer's power washing jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['power-washing-customer-jobs', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_jobs')
        .select('id, job_number, property_type, special_instructions, status, created_at, quoted_price')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  // Fetch customer's quotes
  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['power-washing-customer-quotes', customerId, customer?.email],
    queryFn: async () => {
      if (!customer?.email) return [];
      const { data, error } = await supabase
        .from('power_washing_quotes')
        .select('id, quote_number, property_type, status, created_at, quoted_price')
        .eq('customer_email', customer.email)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.email
  });

  // Fetch customer's invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['power-washing-customer-invoices', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_invoices')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  // Fetch customer edit history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['customer-history', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('resource_type', 'customers')
        .eq('resource_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!customerId
  });

  const handleSave = () => {
    if (!editData.first_name || !editData.last_name) {
      toast.error('First name and last name are required');
      return;
    }
    updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    if (customer) {
      setEditData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        postal_code: customer.postal_code || '',
        notes: customer.notes || '',
        business_type: customer.business_type || '',
        communication_preference: customer.communication_preference || '',
        latitude: customer.latitude || null,
        longitude: customer.longitude || null
      });
    }
    setIsEditing(false);
  };

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
      case 'in_progress': case 'in progress': case 'active': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'pending': case 'scheduled': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'paid': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'sent': case 'draft': return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatFieldName = (field: string) => {
    return field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getChangedFields = (oldValues: Record<string, unknown>, newValues: Record<string, unknown>) => {
    const changes: { field: string; old: string; new: string }[] = [];
    const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})]);
    
    allKeys.forEach(key => {
      const oldVal = oldValues?.[key];
      const newVal = newValues?.[key];
      if (oldVal !== newVal) {
        changes.push({
          field: formatFieldName(key),
          old: String(oldVal || 'Empty'),
          new: String(newVal || 'Empty')
        });
      }
    });
    
    return changes;
  };

  // Get display name - prioritize company for business accounts
  const displayName = customer.company || `${customer.first_name} ${customer.last_name}`;
  const contactName = customer.company && (customer.first_name || customer.last_name) 
    ? `Contact: ${customer.first_name} ${customer.last_name}` 
    : "Customer Details";

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title={displayName}
        subtitle={contactName}
        icon={<User className="h-6 w-6 md:h-8 md:w-8 text-cyan-600 shrink-0" />}
        onBack={() => navigate('/power-washing/customers')}
      />

      {/* Customer Info Card with Inline Editing */}
      <Card className="mb-4 md:mb-6">
        <CardHeader className="p-3 md:p-6 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <User className="h-4 w-4 md:h-5 md:w-5 text-cyan-600" />
            Contact Information
          </CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          {isEditing ? (
            <div className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={editData.first_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={editData.last_name}
                    onChange={(e) => setEditData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editData.phone}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {/* Address Fields with Autocomplete */}
              <div className="space-y-1.5">
                <Label htmlFor="address">Street Address</Label>
                <AddressAutocomplete
                  value={editData.address}
                  onChange={(value) => setEditData(prev => ({ ...prev, address: value }))}
                  onSelect={handleAddressSelect}
                  placeholder="Start typing an address..."
                  className="border-cyan-500/20 focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editData.city}
                    onChange={(e) => setEditData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={editData.state}
                    onChange={(e) => setEditData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="TX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="postal_code">ZIP</Label>
                  <Input
                    id="postal_code"
                    value={editData.postal_code}
                    onChange={(e) => setEditData(prev => ({ ...prev, postal_code: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
              </div>

              {/* Map Preview in Edit Mode */}
              {editData.latitude && editData.longitude && (
                <div className="space-y-2">
                  <Label>Location Preview</Label>
                  <MiniMapPreview
                    latitude={editData.latitude}
                    longitude={editData.longitude}
                    draggable={true}
                    onLocationChange={(lat, lng) => setEditData(prev => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng
                    }))}
                    className="h-[180px]"
                  />
                  <p className="text-xs text-muted-foreground">Drag the pin to adjust the exact location</p>
                </div>
              )}

              {/* Property Type and Contact Preference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="business_type">Property Type</Label>
                  <Select
                    value={editData.business_type}
                    onValueChange={(value) => setEditData(prev => ({ ...prev, business_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="industrial">Industrial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="communication_preference">Preferred Contact</Label>
                  <Select
                    value={editData.communication_preference}
                    onValueChange={(value) => setEditData(prev => ({ ...prev, communication_preference: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about the customer..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Display Mode - Always show fields with placeholders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={`text-sm md:text-base truncate ${!customer.phone ? 'text-muted-foreground italic' : ''}`}>
                    {customer.phone || 'No phone number'}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className={`text-sm md:text-base truncate ${!customer.email ? 'text-muted-foreground italic' : ''}`}>
                    {customer.email || 'No email address'}
                  </span>
                </div>
                <div className="flex items-start gap-2 sm:col-span-2 lg:col-span-1 min-w-0">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className={`text-sm md:text-base break-words ${!customer.address ? 'text-muted-foreground italic' : ''}`}>
                    {customer.address 
                      ? `${customer.address}${customer.city ? `, ${customer.city}` : ''}${customer.state ? `, ${customer.state}` : ''} ${customer.postal_code || ''}`
                      : 'No address'}
                  </span>
                </div>
              </div>

              {/* Property Type and Preferred Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Property:</span>
                  <span className={`text-sm md:text-base capitalize ${!customer.business_type ? 'text-muted-foreground italic' : ''}`}>
                    {customer.business_type || 'Not specified'}
                  </span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Contact:</span>
                  <span className={`text-sm md:text-base capitalize ${!customer.communication_preference ? 'text-muted-foreground italic' : ''}`}>
                    {customer.communication_preference || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-3 md:mt-4 p-2 md:p-3 bg-muted/50 rounded-lg">
                <p className={`text-xs md:text-sm ${!customer.notes ? 'text-muted-foreground italic' : 'text-muted-foreground'}`}>
                  {customer.notes || 'No notes added'}
                </p>
              </div>

              {/* Location Map */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-600" />
                    Location
                  </h4>
                  {(customer.latitude && customer.longitude) && (
                    <a
                      href={`https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                    >
                      Open in Maps
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {customer.latitude && customer.longitude ? (
                  <MiniMapPreview
                    latitude={customer.latitude}
                    longitude={customer.longitude}
                    draggable={false}
                    className="h-[200px]"
                  />
                ) : (
                  <div className="h-[120px] bg-muted/50 rounded-lg flex flex-col items-center justify-center gap-2">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground italic">No location captured</p>
                    <p className="text-xs text-muted-foreground">Edit address to capture location</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for related data */}
      <Tabs defaultValue="jobs" className="space-y-3 md:space-y-4">
        <TabsList className="flex w-full overflow-x-auto gap-1 pb-1 scrollbar-hide h-auto p-1">
          <TabsTrigger value="jobs" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <Briefcase className="h-3 w-3 md:h-4 md:w-4" />
            Jobs
            <span>({jobs?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="property" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <Ruler className="h-3 w-3 md:h-4 md:w-4" />
            Property
          </TabsTrigger>
          <TabsTrigger value="quotes" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            Quotes
            <span>({quotes?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <Receipt className="h-3 w-3 md:h-4 md:w-4" />
            Invoices
            <span>({invoices?.length || 0})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-shrink-0 gap-1 px-2 md:px-3 text-xs md:text-sm">
            <History className="h-3 w-3 md:h-4 md:w-4" />
            History
            <span>({history?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Power Washing Jobs</CardTitle>
              <Button 
                size="sm" 
                onClick={() => navigate(`/power-washing/jobs/new?customer=${customerId}`)}
                className="bg-cyan-600 hover:bg-cyan-700 w-full sm:w-auto"
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
                      onClick={() => navigate(`/power-washing/jobs/${job.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base">{job.job_number || `Job #${job.id.slice(0, 8)}`}</span>
                          <div className="text-xs md:text-sm text-muted-foreground truncate">
                            {job.property_type || job.special_instructions || 'Power Washing Service'}
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

        {/* Property Areas Tab */}
        <TabsContent value="property">
          {customerId && shopId && (
            <PropertyAreasTab 
              customerId={customerId} 
              shopId={shopId}
              customerAddress={{
                address: customer?.address,
                city: customer?.city,
                state: customer?.state,
                postal_code: customer?.postal_code
              }}
            />
          )}
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Quotes</CardTitle>
              <Button 
                size="sm" 
                onClick={() => navigate(`/power-washing/quotes/new?customer=${customerId}`)}
                className="bg-cyan-600 hover:bg-cyan-700 w-full sm:w-auto"
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
                      onClick={() => navigate(`/power-washing/quotes/${quote.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base">{quote.quote_number || `Quote #${quote.id.slice(0, 8)}`}</span>
                          <div className="text-xs md:text-sm text-muted-foreground truncate">
                            {quote.property_type || 'Power Washing Quote'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(quote.status || 'pending')}>{quote.status || 'pending'}</Badge>
                          <span className="font-medium text-sm md:text-base">${quote.quoted_price?.toFixed(2) || '0.00'}</span>
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
                      onClick={() => navigate(`/power-washing/invoices/${invoice.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base">{invoice.invoice_number || `Invoice #${invoice.id.slice(0, 8)}`}</span>
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

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <History className="h-4 w-4 md:h-5 md:w-5 text-cyan-600" />
                Edit History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : history?.length === 0 ? (
                <p className="text-muted-foreground text-center py-6 md:py-8 text-sm md:text-base">
                  No edit history found
                </p>
              ) : (
                <div className="space-y-4">
                  {history?.map((entry) => {
                    const changes = getChangedFields(
                      entry.old_values as Record<string, unknown> || {}, 
                      entry.new_values as Record<string, unknown> || {}
                    );
                    
                    return (
                      <div 
                        key={entry.id}
                        className="p-3 md:p-4 bg-muted/50 rounded-lg border-l-4 border-cyan-500"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {entry.action}
                          </Badge>
                        </div>
                        
                        {changes.length > 0 ? (
                          <div className="space-y-1 mt-2">
                            {changes.map((change, idx) => (
                              <div key={idx} className="text-xs md:text-sm">
                                <span className="font-medium">{change.field}:</span>{' '}
                                <span className="text-red-500 line-through">{change.old}</span>{' '}
                                <span className="text-muted-foreground">→</span>{' '}
                                <span className="text-green-600">{change.new}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">Record created</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MobilePageContainer>
  );
}
