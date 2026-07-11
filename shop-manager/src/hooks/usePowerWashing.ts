import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// Types
export interface PowerWashingService {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  category: string;
  base_price_per_sqft: number | null;
  minimum_price: number | null;
  estimated_time_minutes: number | null;
  requires_chemicals: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface PowerWashingEquipment {
  id: string;
  shop_id: string;
  name: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  psi_rating: number | null;
  gpm_rating: number | null;
  purchase_date: string | null;
  purchase_price: number | null;
  condition: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PowerWashingChemical {
  id: string;
  shop_id: string;
  name: string;
  chemical_type: string;
  brand: string | null;
  dilution_ratio: string | null;
  current_quantity: number;
  unit_of_measure: string;
  reorder_level: number | null;
  cost_per_unit: number | null;
  supplier: string | null;
  safety_notes: string | null;
  sds_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PowerWashingJob {
  id: string;
  shop_id: string;
  job_number: string;
  customer_id: string | null;
  service_id: string | null;
  status: string;
  priority: string;
  property_type: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  property_latitude: number | null;
  property_longitude: number | null;
  square_footage: number | null;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  assigned_crew: string[] | null;
  quoted_price: number | null;
  final_price: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  before_photos: string[] | null;
  after_photos: string[] | null;
  customer_notes: string | null;
  internal_notes: string | null;
  special_instructions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PowerWashingQuote {
  id: string;
  shop_id: string;
  quote_number: string;
  status: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  property_type: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_zip: string | null;
  estimated_sqft: number | null;
  services_requested: string[] | null;
  preferred_date: string | null;
  flexibility: string | null;
  additional_details: string | null;
  property_photos: string[] | null;
  quoted_price: number | null;
  quote_notes: string | null;
  quoted_by: string | null;
  quoted_at: string | null;
  valid_until: string | null;
  converted_to_job_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

// Services hooks
export function usePowerWashingServices() {
  return useQuery({
    queryKey: ['power-washing-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_services')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as PowerWashingService[];
    },
  });
}

// Equipment hooks
export function usePowerWashingEquipment() {
  return useQuery({
    queryKey: ['power-washing-equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_equipment')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as PowerWashingEquipment[];
    },
  });
}

// Chemicals hooks
export function usePowerWashingChemicals() {
  return useQuery({
    queryKey: ['power-washing-chemicals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_chemicals')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as PowerWashingChemical[];
    },
  });
}

// Jobs hooks
export function usePowerWashingJobs(status?: string) {
  return useQuery({
    queryKey: ['power-washing-jobs', status],
    queryFn: async () => {
      let query = supabase
        .from('power_washing_jobs')
        .select('*')
        .order('scheduled_date', { ascending: true });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PowerWashingJob[];
    },
  });
}

// Quotes hooks
export function usePowerWashingQuotes(status?: string) {
  return useQuery({
    queryKey: ['power-washing-quotes', status],
    queryFn: async () => {
      let query = supabase
        .from('power_washing_quotes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PowerWashingQuote[];
    },
  });
}

// Dashboard stats hook
export function usePowerWashingStats() {
  return useQuery({
    queryKey: ['power-washing-stats'],
    queryFn: async () => {
      const [jobsResult, quotesResult, equipmentResult, chemicalsResult] = await Promise.all([
        supabase.from('power_washing_jobs').select('status, final_price'),
        supabase.from('power_washing_quotes').select('status'),
        supabase.from('power_washing_equipment').select('condition, next_maintenance_date'),
        supabase.from('power_washing_chemicals').select('current_quantity, reorder_level'),
      ]);

      const jobs = jobsResult.data || [];
      const quotes = quotesResult.data || [];
      const equipment = equipmentResult.data || [];
      const chemicals = chemicalsResult.data || [];

      const today = new Date().toISOString().split('T')[0];

      return {
        totalJobs: jobs.length,
        pendingJobs: jobs.filter(j => j.status === 'pending').length,
        scheduledJobs: jobs.filter(j => j.status === 'scheduled').length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        revenue: jobs.filter(j => j.status === 'completed').reduce((sum, j) => sum + (j.final_price || 0), 0),
        pendingQuotes: quotes.filter(q => q.status === 'pending').length,
        equipmentNeedingMaintenance: equipment.filter(e => 
          e.next_maintenance_date && e.next_maintenance_date <= today
        ).length,
        lowChemicals: chemicals.filter(c => 
          c.reorder_level && c.current_quantity <= c.reorder_level
        ).length,
      };
    },
  });
}

// Input types for mutations
type CreateJobInput = Pick<PowerWashingJob, 'shop_id' | 'job_number'> & Partial<Omit<PowerWashingJob, 'id' | 'shop_id' | 'job_number'>>;
type CreateQuoteInput = Pick<PowerWashingQuote, 'shop_id' | 'quote_number' | 'customer_name' | 'property_type' | 'property_address'> & Partial<Omit<PowerWashingQuote, 'id' | 'shop_id' | 'quote_number' | 'customer_name' | 'property_type' | 'property_address'>>;

// Mutations
export function useCreatePowerWashingJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (job: CreateJobInput) => {
      const { data, error } = await supabase
        .from('power_washing_jobs')
        .insert([job])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-stats'] });
      toast.success('Job created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create job: ' + error.message);
    },
  });
}

export function useUpdatePowerWashingJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PowerWashingJob> & { id: string }) => {
      const { data, error } = await supabase
        .from('power_washing_jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-stats'] });
      toast.success('Job updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update job: ' + error.message);
    },
  });
}

export function useCreatePowerWashingQuote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (quote: CreateQuoteInput) => {
      const { data, error } = await supabase
        .from('power_washing_quotes')
        .insert([quote])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-stats'] });
      toast.success('Quote request submitted');
    },
    onError: (error) => {
      toast.error('Failed to submit quote: ' + error.message);
    },
  });
}

// Formula types
export interface FormulaIngredient {
  chemical_id: string;
  amount: number;
  unit: string;
}

export interface PowerWashingFormula {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  surface_type: string | null;
  application: string | null;
  ingredients: FormulaIngredient[];
  water_gallons: number;
  notes: string | null;
  is_favorite: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Formulas hooks
export function usePowerWashingFormulas() {
  return useQuery({
    queryKey: ['power-washing-formulas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_formulas')
        .select('*')
        .eq('is_active', true)
        .order('is_favorite', { ascending: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        ingredients: (item.ingredients as unknown as FormulaIngredient[]) || []
      })) as PowerWashingFormula[];
    },
  });
}

export function useCreateFormula() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formula: Omit<PowerWashingFormula, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('power_washing_formulas')
        .insert([{
          shop_id: formula.shop_id,
          name: formula.name,
          description: formula.description,
          surface_type: formula.surface_type,
          application: formula.application,
          water_gallons: formula.water_gallons,
          notes: formula.notes,
          is_favorite: formula.is_favorite,
          is_active: formula.is_active,
          created_by: formula.created_by,
          ingredients: JSON.parse(JSON.stringify(formula.ingredients)),
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-formulas'] });
      toast.success('Formula created');
    },
    onError: (error) => {
      toast.error('Failed to create formula: ' + error.message);
    },
  });
}

export function useUpdateFormula() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PowerWashingFormula> & { id: string }) => {
      const payload: Record<string, Json | undefined> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.surface_type !== undefined) payload.surface_type = updates.surface_type;
      if (updates.application !== undefined) payload.application = updates.application;
      if (updates.water_gallons !== undefined) payload.water_gallons = updates.water_gallons;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.is_favorite !== undefined) payload.is_favorite = updates.is_favorite;
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;
      if (updates.ingredients !== undefined) {
        payload.ingredients = JSON.parse(JSON.stringify(updates.ingredients));
      }
      const { data, error } = await supabase
        .from('power_washing_formulas')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-formulas'] });
      toast.success('Formula updated');
    },
    onError: (error) => {
      toast.error('Failed to update formula: ' + error.message);
    },
  });
}

export function useDeleteFormula() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('power_washing_formulas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-formulas'] });
      toast.success('Formula deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete formula: ' + error.message);
    },
  });
}

// ======= Phase 2: Time Entries, Chemical Usage, Maintenance =======

export interface PowerWashingTimeEntry {
  id: string;
  job_id: string;
  employee_id: string;
  shop_id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface PowerWashingJobChemical {
  id: string;
  job_id: string;
  chemical_id: string;
  shop_id: string;
  quantity_used: number;
  unit_of_measure: string;
  cost_at_use: number | null;
  notes: string | null;
  created_at: string;
}

export interface PowerWashingMaintenanceLog {
  id: string;
  equipment_id: string;
  shop_id: string;
  maintenance_type: string;
  performed_by: string | null;
  performed_date: string;
  cost: number | null;
  parts_used: string[] | null;
  notes: string | null;
  next_due_date: string | null;
  next_due_hours: number | null;
  created_at: string;
}

// Time entries for a job
export function usePowerWashingTimeEntries(jobId: string) {
  return useQuery({
    queryKey: ['power-washing-time-entries', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_time_entries')
        .select('*')
        .eq('job_id', jobId)
        .order('clock_in', { ascending: false });
      if (error) throw error;
      return data as PowerWashingTimeEntry[];
    },
    enabled: !!jobId,
  });
}

// Chemical usage for a job
export function usePowerWashingJobChemicals(jobId: string) {
  return useQuery({
    queryKey: ['power-washing-job-chemicals', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_job_chemicals')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PowerWashingJobChemical[];
    },
    enabled: !!jobId,
  });
}

// Maintenance logs for equipment
export function usePowerWashingMaintenanceLogs(equipmentId: string) {
  return useQuery({
    queryKey: ['power-washing-maintenance-logs', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_maintenance_logs')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('performed_date', { ascending: false });
      if (error) throw error;
      return data as PowerWashingMaintenanceLog[];
    },
    enabled: !!equipmentId,
  });
}

// Equipment update mutation
export function useUpdatePowerWashingEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PowerWashingEquipment> & { id: string }) => {
      const { data, error } = await supabase
        .from('power_washing_equipment')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-equipment'] });
      toast.success('Equipment updated');
    },
    onError: (error) => {
      toast.error('Failed to update equipment: ' + error.message);
    },
  });
}

// Chemical update mutation
export function useUpdatePowerWashingChemical() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PowerWashingChemical> & { id: string }) => {
      const { data, error } = await supabase
        .from('power_washing_chemicals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-chemicals'] });
      toast.success('Chemical updated');
    },
    onError: (error) => {
      toast.error('Failed to update chemical: ' + error.message);
    },
  });
}

// ======= Phase 3: Recurring Schedules, Invoices =======

export interface PowerWashingRecurringSchedule {
  id: string;
  shop_id: string;
  schedule_name: string;
  recurrence_type: string;
  day_of_week: number | null;
  day_of_month: number | null;
  preferred_time_start: string | null;
  property_address: string | null;
  property_city: string | null;
  agreed_price: number | null;
  is_active: boolean;
  next_scheduled_date: string | null;
  jobs_completed: number;
  created_at: string;
}

export interface PowerWashingInvoice {
  id: string;
  shop_id: string;
  job_id: string | null;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance_due: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
}

// Recurring schedules hook
export function usePowerWashingRecurringSchedules() {
  return useQuery({
    queryKey: ['power-washing-recurring-schedules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('power_washing_recurring_schedules')
        .select('*')
        .eq('is_active', true)
        .order('next_scheduled_date', { ascending: true });
      if (error) throw error;
      return data as PowerWashingRecurringSchedule[];
    },
  });
}

// Invoices hook
export function usePowerWashingInvoices(status?: string) {
  return useQuery({
    queryKey: ['power-washing-invoices', status],
    queryFn: async () => {
      let query = supabase
        .from('power_washing_invoices')
        .select('*')
        .order('issue_date', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PowerWashingInvoice[];
    },
  });
}

// Create invoice mutation
export function useCreatePowerWashingInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: Omit<PowerWashingInvoice, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('power_washing_invoices')
        .insert([invoice])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-invoices'] });
      toast.success('Invoice created');
    },
    onError: (error) => {
      toast.error('Failed to create invoice: ' + error.message);
    },
  });
}

// Update invoice mutation
export function useUpdatePowerWashingInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PowerWashingInvoice> & { id: string }) => {
      const { data, error } = await supabase
        .from('power_washing_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-invoices'] });
      toast.success('Invoice updated');
    },
    onError: (error) => {
      toast.error('Failed to update invoice: ' + error.message);
    },
  });
}
