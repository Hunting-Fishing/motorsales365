import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Helper to get current user's shop_id
async function getShopId(): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('shop_id').single();
  return data?.shop_id || null;
}

// Types
export interface GunsmithJob {
  id: string;
  job_number: string;
  ro_number: string;
  customer_id?: string;
  firearm_id?: string;
  status: string;
  priority: string;
  job_type: string;
  description?: string;
  diagnosis?: string;
  work_performed?: string;
  labor_hours?: number;
  labor_rate?: number;
  parts_cost?: number;
  total_cost?: number;
  estimated_completion?: string;
  actual_completion?: string;
  assigned_to?: string;
  received_date?: string;
  notes?: string;
  created_at: string;
  customers?: { first_name: string; last_name?: string };
  gunsmith_firearms?: { make: string; model: string; serial_number?: string };
}

export interface GunsmithFirearm {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  serial_number?: string;
  caliber?: string;
  firearm_type: string;
  classification: string;
  barrel_length?: number;
  registration_number?: string;
  condition?: string;
  notes?: string;
  photo_url?: string;
  customers?: { first_name: string; last_name?: string };
}

export interface GunsmithPart {
  id: string;
  part_number?: string;
  name: string;
  category?: string;
  manufacturer?: string;
  quantity: number;
  min_quantity: number;
  unit_cost?: number;
  retail_price?: number;
  location?: string;
  is_serialized?: boolean;
  compatible_firearms?: string[];
}

export interface GunsmithQuote {
  id: string;
  quote_number: string;
  customer_id?: string;
  firearm_id?: string;
  status: string;
  valid_until?: string;
  labor_estimate?: number;
  parts_estimate?: number;
  total_estimate?: number;
  notes?: string;
  created_at: string;
  customers?: { first_name: string; last_name?: string };
  gunsmith_firearms?: { make: string; model: string };
}

export interface GunsmithAppointment {
  id: string;
  customer_id?: string;
  firearm_id?: string;
  appointment_date: string;
  appointment_type: string;
  duration_minutes?: number;
  status: string;
  notes?: string;
  customers?: { first_name: string; last_name?: string };
}

export interface GunsmithTransfer {
  id: string;
  transfer_type: string;
  customer_id?: string;
  firearm_id?: string;
  transfer_date?: string;
  cfo_reference?: string;
  att_number?: string;
  status: string;
  notes?: string;
  customers?: { first_name: string; last_name?: string };
  gunsmith_firearms?: { make: string; model: string; serial_number?: string };
}

export interface GunsmithConsignment {
  id: string;
  customer_id?: string;
  firearm_id?: string;
  asking_price?: number;
  minimum_price?: number;
  commission_rate?: number;
  start_date?: string;
  end_date?: string;
  status: string;
  notes?: string;
  customers?: { first_name: string; last_name?: string };
  gunsmith_firearms?: { make: string; model: string };
}

export interface GunsmithInvoice {
  id: string;
  invoice_number: string;
  job_id?: string;
  customer_id?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  status: string;
  due_date?: string;
  paid_date?: string;
  notes?: string;
  customers?: { first_name: string; last_name?: string };
}

export interface GunsmithLicense {
  id: string;
  customer_id: string;
  license_type: string;
  license_number?: string;
  issue_date?: string;
  expiry_date?: string;
  status: string;
  customers?: { first_name: string; last_name?: string };
}

// Stats hook
export function useGunsmithStats() {
  return useQuery({
    queryKey: ['gunsmith-stats'],
    queryFn: async () => {
      const [jobsResult, partsResult, appointmentsResult, licensesResult] = await Promise.all([
        (supabase as any).from('gunsmith_jobs').select('status, total_cost'),
        (supabase as any).from('gunsmith_parts').select('quantity, min_quantity'),
        (supabase as any).from('gunsmith_appointments').select('status').eq('status', 'scheduled'),
        (supabase as any).from('gunsmith_customer_licenses').select('expiry_date')
      ]);

      const jobs = jobsResult.data || [];
      const parts = partsResult.data || [];
      const appointments = appointmentsResult.data || [];
      const licenses = licensesResult.data || [];

      const pendingJobs = jobs.filter((j: any) => j.status === 'pending').length;
      const inProgressJobs = jobs.filter((j: any) => j.status === 'in_progress').length;
      const awaitingPartsJobs = jobs.filter((j: any) => j.status === 'awaiting_parts').length;
      const completedJobs = jobs.filter((j: any) => j.status === 'completed').length;
      const revenue = jobs.filter((j: any) => j.status === 'completed').reduce((sum: number, j: any) => sum + (j.total_cost || 0), 0);
      const lowStockParts = parts.filter((p: any) => p.quantity <= p.min_quantity).length;
      const upcomingAppointments = appointments.length;
      
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringLicenses = licenses.filter((l: any) => {
        const expiry = new Date(l.expiry_date);
        return expiry <= thirtyDaysFromNow && expiry >= today;
      }).length;

      return {
        pendingJobs,
        inProgressJobs,
        awaitingPartsJobs,
        completedJobs,
        revenue,
        lowStockParts,
        upcomingAppointments,
        expiringLicenses
      };
    }
  });
}

// Jobs hooks
export function useGunsmithJobs(status?: string) {
  return useQuery({
    queryKey: ['gunsmith-jobs', status],
    queryFn: async () => {
      let query = (supabase as any)
        .from('gunsmith_jobs')
        .select('*, customers(first_name, last_name), gunsmith_firearms(make, model, serial_number)')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as GunsmithJob[];
    }
  });
}

export function useGunsmithJob(id: string) {
  return useQuery({
    queryKey: ['gunsmith-job', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_jobs')
        .select('*, customers(first_name, last_name, email, phone), gunsmith_firearms(make, model, serial_number, caliber, classification)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as GunsmithJob;
    },
    enabled: !!id
  });
}

export function useCreateGunsmithJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (job: Partial<GunsmithJob>) => {
      const shopId = await getShopId();
      
      // Get the next sequential job number
      const { data: lastJob } = await (supabase as any)
        .from('gunsmith_jobs')
        .select('job_number')
        .like('job_number', 'RO#%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      let nextNumber = 1;
      if (lastJob?.job_number) {
        const match = lastJob.job_number.match(/RO#(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const jobNumber = `RO#${nextNumber}`;
      
      const { error } = await (supabase as any)
        .from('gunsmith_jobs')
        .insert({ ...job, job_number: jobNumber, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-stats'] });
      toast({ title: 'Job created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create job', variant: 'destructive' });
    }
  });
}

export function useUpdateGunsmithJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithJob> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_jobs')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-job'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-stats'] });
      toast({ title: 'Job updated' });
    }
  });
}

export function useDeleteGunsmithJob() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('gunsmith_jobs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-stats'] });
      toast({ title: 'Job deleted' });
    }
  });
}

// Firearms hooks
export function useGunsmithFirearms(customerId?: string) {
  return useQuery({
    queryKey: ['gunsmith-firearms', customerId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('gunsmith_firearms')
        .select('*, customers(first_name, last_name)')
        .order('created_at', { ascending: false });
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as GunsmithFirearm[];
    }
  });
}

export function useGunsmithFirearm(id: string) {
  return useQuery({
    queryKey: ['gunsmith-firearm', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_firearms')
        .select('*, customers(first_name, last_name, email, phone)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as GunsmithFirearm;
    },
    enabled: !!id
  });
}

export function useCreateGunsmithFirearm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (firearm: Partial<GunsmithFirearm>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('gunsmith_firearms')
        .insert({ ...firearm, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-firearms'] });
      toast({ title: 'Firearm registered successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to register firearm', variant: 'destructive' });
    }
  });
}

export function useUpdateGunsmithFirearm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithFirearm> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_firearms')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-firearms'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-firearm'] });
      toast({ title: 'Firearm updated' });
    }
  });
}

// Parts hooks
export function useGunsmithParts() {
  return useQuery({
    queryKey: ['gunsmith-parts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_parts')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as GunsmithPart[];
    }
  });
}

export function useGunsmithPart(id: string) {
  return useQuery({
    queryKey: ['gunsmith-part', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_parts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as GunsmithPart;
    },
    enabled: !!id
  });
}

export function useCreateGunsmithPart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (part: Partial<GunsmithPart>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('gunsmith_parts')
        .insert({ ...part, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-parts'] });
      toast({ title: 'Part added successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to add part', variant: 'destructive' });
    }
  });
}

export function useUpdateGunsmithPart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithPart> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_parts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-parts'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-part'] });
      toast({ title: 'Part updated' });
    }
  });
}

// Quotes hooks
export function useGunsmithQuotes() {
  return useQuery({
    queryKey: ['gunsmith-quotes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_quotes')
        .select('*, customers(first_name, last_name), gunsmith_firearms(make, model)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GunsmithQuote[];
    }
  });
}

export function useGunsmithQuote(id: string) {
  return useQuery({
    queryKey: ['gunsmith-quote', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_quotes')
        .select('*, customers(first_name, last_name, email, phone), gunsmith_firearms(make, model, serial_number)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as GunsmithQuote;
    },
    enabled: !!id
  });
}

export function useCreateGunsmithQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quote: Partial<GunsmithQuote>) => {
      const shopId = await getShopId();
      const quoteNumber = `QT-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await (supabase as any)
        .from('gunsmith_quotes')
        .insert({ ...quote, quote_number: quoteNumber, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-quotes'] });
      toast({ title: 'Quote created' });
    }
  });
}

export function useUpdateGunsmithQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithQuote> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_quotes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-quote'] });
      toast({ title: 'Quote updated' });
    }
  });
}

// Appointments hooks
export function useGunsmithAppointments() {
  return useQuery({
    queryKey: ['gunsmith-appointments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_appointments')
        .select('*, customers(first_name, last_name)')
        .order('appointment_date', { ascending: true });
      if (error) throw error;
      return data as GunsmithAppointment[];
    }
  });
}

export function useCreateGunsmithAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (appointment: Partial<GunsmithAppointment>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('gunsmith_appointments')
        .insert({ ...appointment, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-stats'] });
      toast({ title: 'Appointment scheduled' });
    }
  });
}

// Transfers hooks
export function useGunsmithTransfers() {
  return useQuery({
    queryKey: ['gunsmith-transfers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_transfers')
        .select('*, customers(first_name, last_name), gunsmith_firearms(make, model, serial_number)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GunsmithTransfer[];
    }
  });
}

export function useCreateGunsmithTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (transfer: Partial<GunsmithTransfer>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('gunsmith_transfers')
        .insert({ ...transfer, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-transfers'] });
      toast({ title: 'Transfer recorded' });
    }
  });
}

export function useUpdateGunsmithTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithTransfer> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_transfers')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-transfers'] });
      toast({ title: 'Transfer updated' });
    }
  });
}

// Consignments hooks
export function useGunsmithConsignments() {
  return useQuery({
    queryKey: ['gunsmith-consignments'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_consignments')
        .select('*, customers(first_name, last_name), gunsmith_firearms(make, model)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GunsmithConsignment[];
    }
  });
}

export function useCreateGunsmithConsignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (consignment: Partial<GunsmithConsignment>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('gunsmith_consignments')
        .insert({ ...consignment, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-consignments'] });
      toast({ title: 'Consignment created' });
    }
  });
}

export function useUpdateGunsmithConsignment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithConsignment> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_consignments')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-consignments'] });
      toast({ title: 'Consignment updated' });
    }
  });
}

// Invoices hooks
export function useGunsmithInvoices() {
  return useQuery({
    queryKey: ['gunsmith-invoices'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_invoices')
        .select('*, customers(first_name, last_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GunsmithInvoice[];
    }
  });
}

export function useCreateGunsmithInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoice: Partial<GunsmithInvoice>) => {
      const shopId = await getShopId();
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await (supabase as any)
        .from('gunsmith_invoices')
        .insert({ ...invoice, invoice_number: invoiceNumber, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-invoices'] });
      toast({ title: 'Invoice created' });
    }
  });
}

export function useUpdateGunsmithInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GunsmithInvoice> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('gunsmith_invoices')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-invoices'] });
      toast({ title: 'Invoice updated' });
    }
  });
}

// Licenses hooks
export function useGunsmithLicenses() {
  return useQuery({
    queryKey: ['gunsmith-licenses'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_customer_licenses')
        .select('*, customers(first_name, last_name)')
        .order('expiry_date', { ascending: true });
      if (error) throw error;
      return data as GunsmithLicense[];
    }
  });
}

// File upload helper
export async function uploadGunsmithDocument(file: File, folder: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('gunsmith-documents')
    .upload(fileName, file);
  
  if (error) throw error;
  
  const { data } = supabase.storage
    .from('gunsmith-documents')
    .getPublicUrl(fileName);
  
  return data.publicUrl;
}
