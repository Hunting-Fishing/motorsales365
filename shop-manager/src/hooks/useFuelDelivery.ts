import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Helper to get current user's shop_id
async function getShopId(): Promise<string | null> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const user = userRes.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('shop_id')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  if (error) throw error;
  return data?.shop_id ?? null;
}

// Types
export interface FuelDeliveryCustomer {
  id: string;
  shop_id: string;
  customer_id?: string;
  company_name?: string;
  contact_name: string;
  phone?: string;
  email?: string;
  billing_address?: string;
  billing_latitude?: number;
  billing_longitude?: number;
  delivery_instructions?: string;
  payment_terms?: string;
  credit_limit?: number;
  current_balance?: number;
  tax_exempt?: boolean;
  tax_exempt_number?: string;
  preferred_fuel_type?: string;
  auto_delivery?: boolean;
  delivery_frequency?: string;
  delivery_days?: number[];
  preferred_delivery_time?: string;
  minimum_delivery_gallons?: number;
  is_active?: boolean;
  notes?: string;
  created_at: string;
  customers?: { first_name: string; last_name?: string };
}

export interface FuelDeliveryLocation {
  id: string;
  shop_id: string;
  customer_id?: string;
  location_name: string;
  address: string;
  city?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  tank_capacity_gallons?: number;
  current_level_gallons?: number;
  tank_type?: string;
  fuel_type: string;
  access_instructions?: string;
  contact_on_site?: string;
  contact_phone?: string;
  requires_appointment?: boolean;
  special_equipment_needed?: string;
  last_delivery_date?: string;
  is_active?: boolean;
  delivery_days?: number[];
  delivery_frequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'on_demand';
  preferred_delivery_time?: string;
  fuel_delivery_customers?: FuelDeliveryCustomer;
}

export interface FuelDeliveryProduct {
  id: string;
  shop_id: string;
  product_name: string;
  product_code?: string;
  fuel_type: string;
  unit_of_measure?: string;
  base_price_per_unit?: number;
  cost_per_unit?: number;
  tax_rate?: number;
  is_taxable?: boolean;
  minimum_order_quantity?: number;
  description?: string;
  is_active?: boolean;
}

export interface FuelDeliveryOrder {
  id: string;
  shop_id: string;
  order_number: string;
  customer_id?: string;
  location_id?: string;
  product_id?: string;
  order_date: string;
  requested_date?: string;
  scheduled_date?: string;
  quantity_ordered: number;
  price_per_unit?: number;
  subtotal?: number;
  tax_amount?: number;
  delivery_fee?: number;
  total_amount?: number;
  status: string;
  priority?: string;
  driver_id?: string;
  truck_id?: string;
  route_id?: string;
  special_instructions?: string;
  internal_notes?: string;
  created_at: string;
  fuel_delivery_customers?: FuelDeliveryCustomer;
  fuel_delivery_locations?: FuelDeliveryLocation;
  fuel_delivery_products?: FuelDeliveryProduct;
  fuel_delivery_drivers?: FuelDeliveryDriver;
  fuel_delivery_trucks?: FuelDeliveryTruck;
}

export interface TruckCompartmentData {
  id: string;
  compartment_number: number;
  compartment_name: string | null;
  capacity_gallons: number;
  current_level_gallons: number;
  product?: {
    id: string;
    product_name: string;
    product_code: string;
    fuel_type: string | null;
  } | null;
}

export interface FuelDeliveryTruck {
  id: string;
  shop_id: string;
  truck_number: string;
  license_plate?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  tank_capacity_gallons?: number;
  current_fuel_load?: number;
  compartments?: number;
  compartment_capacities?: any;
  compartment_data?: TruckCompartmentData[];
  meter_number?: string;
  last_calibration_date?: string;
  next_calibration_due?: string;
  insurance_expiry?: string;
  registration_expiry?: string;
  dot_inspection_due?: string;
  status?: string;
  current_odometer?: number;
  notes?: string;
  is_active?: boolean;
}

export interface FuelDeliveryDriver {
  id: string;
  shop_id: string;
  profile_id?: string;
  driver_number?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  cdl_number?: string;
  cdl_class?: string;
  cdl_state?: string;
  cdl_expiry?: string;
  hazmat_endorsement?: boolean;
  hazmat_expiry?: string;
  tanker_endorsement?: boolean;
  medical_card_expiry?: string;
  hire_date?: string;
  hourly_rate?: number;
  commission_rate?: number;
  status?: string;
  notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  home_address?: string;
  home_latitude?: number;
  home_longitude?: number;
}

export interface FuelDeliveryCompletion {
  id: string;
  shop_id: string;
  order_id?: string;
  driver_id?: string;
  truck_id?: string;
  delivery_date: string;
  arrival_time?: string;
  departure_time?: string;
  gallons_delivered: number;
  meter_start_reading?: number;
  meter_end_reading?: number;
  tank_level_before?: number;
  tank_level_after?: number;
  unit_price?: number;
  subtotal?: number;
  tax_amount?: number;
  delivery_fee?: number;
  total_amount?: number;
  payment_method?: string;
  payment_received?: boolean;
  signature_url?: string;
  delivery_photos?: any;
  gps_latitude?: number;
  gps_longitude?: number;
  odometer_reading?: number;
  customer_present?: boolean;
  notes?: string;
  fuel_delivery_orders?: FuelDeliveryOrder;
  fuel_delivery_drivers?: FuelDeliveryDriver;
  fuel_delivery_trucks?: FuelDeliveryTruck;
}

export interface FuelDeliveryRoute {
  id: string;
  shop_id: string;
  route_name: string;
  route_date: string;
  driver_id?: string;
  truck_id?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  total_stops?: number;
  completed_stops?: number;
  total_gallons_planned?: number;
  total_gallons_delivered?: number;
  total_miles?: number;
  notes?: string;
  fuel_delivery_drivers?: FuelDeliveryDriver;
  fuel_delivery_trucks?: FuelDeliveryTruck;
}

export interface FuelDeliveryInvoice {
  id: string;
  shop_id: string;
  invoice_number: string;
  customer_id?: string;
  invoice_date: string;
  due_date?: string;
  subtotal?: number;
  tax_amount?: number;
  delivery_fees?: number;
  adjustments?: number;
  total_amount?: number;
  amount_paid?: number;
  balance_due?: number;
  status: string;
  notes?: string;
  terms?: string;
  fuel_delivery_customers?: FuelDeliveryCustomer;
}

export interface FuelDeliveryInventory {
  id: string;
  shop_id: string;
  product_id?: string;
  storage_tank_name: string;
  tank_capacity?: number;
  current_quantity?: number;
  minimum_level?: number;
  reorder_level?: number;
  last_reading_date?: string;
  location?: string;
  notes?: string;
  fuel_delivery_products?: FuelDeliveryProduct;
}

// Stats hook
export function useFuelDeliveryStats() {
  return useQuery({
    queryKey: ['fuel-delivery-stats'],
    queryFn: async () => {
      const [ordersResult, completionsResult, driversResult, trucksResult, inventoryResult] = await Promise.all([
        (supabase as any).from('fuel_delivery_orders').select('status, total_amount'),
        (supabase as any).from('fuel_delivery_completions').select('gallons_delivered, total_amount'),
        (supabase as any).from('fuel_delivery_drivers').select('status'),
        (supabase as any).from('fuel_delivery_trucks').select('status'),
        (supabase as any).from('fuel_delivery_inventory').select('current_quantity, minimum_level')
      ]);

      const orders = ordersResult.data || [];
      const completions = completionsResult.data || [];
      const drivers = driversResult.data || [];
      const trucks = trucksResult.data || [];
      const inventory = inventoryResult.data || [];

      const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
      const scheduledOrders = orders.filter((o: any) => o.status === 'scheduled').length;
      const inTransitOrders = orders.filter((o: any) => o.status === 'in_transit').length;
      const completedToday = completions.length;
      const gallonsDeliveredToday = completions.reduce((sum: number, c: any) => sum + (c.gallons_delivered || 0), 0);
      const revenueToday = completions.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
      const activeDrivers = drivers.filter((d: any) => d.status === 'active').length;
      const availableTrucks = trucks.filter((t: any) => t.status === 'available').length;
      const lowInventory = inventory.filter((i: any) => i.current_quantity <= i.minimum_level).length;

      return {
        pendingOrders,
        scheduledOrders,
        inTransitOrders,
        completedToday,
        gallonsDeliveredToday,
        revenueToday,
        activeDrivers,
        availableTrucks,
        lowInventory
      };
    }
  });
}

// Customers hooks
export function useFuelDeliveryCustomers() {
  return useQuery({
    queryKey: ['fuel-delivery-customers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_customers')
        .select('*, customers(first_name, last_name)')
        .order('company_name');
      if (error) throw error;
      return data as FuelDeliveryCustomer[];
    }
  });
}

export function useFuelDeliveryCustomer(id: string) {
  return useQuery({
    queryKey: ['fuel-delivery-customer', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_customers')
        .select('*, customers(first_name, last_name, email, phone)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as FuelDeliveryCustomer;
    },
    enabled: !!id
  });
}

export function useCreateFuelDeliveryCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (customer: Partial<FuelDeliveryCustomer>) => {
      const shopId = await getShopId();
      if (!shopId) {
        throw new Error('No shop found for the current user.');
      }

      const { data, error } = await (supabase as any)
        .from('fuel_delivery_customers')
        .insert({ ...customer, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data as FuelDeliveryCustomer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-customers'] });
      toast({ title: 'Customer created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create customer', variant: 'destructive' });
    }
  });
}

export function useUpdateFuelDeliveryCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryCustomer> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_customers')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-customers'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-customer'] });
      toast({ title: 'Customer updated' });
    }
  });
}

// Locations hooks
export function useFuelDeliveryLocations(customerId?: string) {
  return useQuery({
    queryKey: ['fuel-delivery-locations', customerId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('fuel_delivery_locations')
        .select('*, fuel_delivery_customers(company_name, contact_name)')
        .order('location_name');
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FuelDeliveryLocation[];
    }
  });
}

export function useCreateFuelDeliveryLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (location: Partial<FuelDeliveryLocation>) => {
      const shopId = await getShopId();
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_locations')
        .insert({ ...location, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data as FuelDeliveryLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-locations'] });
      toast({ title: 'Location added successfully' });
    }
  });
}

export function useUpdateFuelDeliveryLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryLocation> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FuelDeliveryLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-locations'] });
      toast({ title: 'Location updated' });
    }
  });
}

// Products hooks
export function useFuelDeliveryProducts() {
  return useQuery({
    queryKey: ['fuel-delivery-products'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_products')
        .select('*')
        .order('product_name');
      if (error) throw error;
      return data as FuelDeliveryProduct[];
    }
  });
}

export function useCreateFuelDeliveryProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (product: Partial<FuelDeliveryProduct>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('fuel_delivery_products')
        .insert({ ...product, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-products'] });
      toast({ title: 'Product added successfully' });
    }
  });
}

export function useUpdateFuelDeliveryProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryProduct> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_products')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-products'] });
      toast({ title: 'Product updated' });
    }
  });
}

// Orders hooks
export function useFuelDeliveryOrders(status?: string) {
  return useQuery({
    queryKey: ['fuel-delivery-orders', status],
    queryFn: async () => {
      let query = (supabase as any)
        .from('fuel_delivery_orders')
        .select(`
          *,
          fuel_delivery_customers(company_name, contact_name),
          fuel_delivery_locations(location_name, address),
          fuel_delivery_products(product_name, fuel_type),
          fuel_delivery_drivers(first_name, last_name),
          fuel_delivery_trucks(truck_number)
        `)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FuelDeliveryOrder[];
    }
  });
}

export function useFuelDeliveryOrder(id: string) {
  return useQuery({
    queryKey: ['fuel-delivery-order', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_orders')
        .select(`
          *,
          fuel_delivery_customers(*, customers(first_name, last_name)),
          fuel_delivery_locations(*),
          fuel_delivery_products(*),
          fuel_delivery_drivers(first_name, last_name),
          fuel_delivery_trucks(truck_number)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as FuelDeliveryOrder;
    },
    enabled: !!id
  });
}

export function useCreateFuelDeliveryOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (order: Partial<FuelDeliveryOrder>) => {
      const shopId = await getShopId();
      const orderNumber = `FD-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await (supabase as any)
        .from('fuel_delivery_orders')
        .insert({ ...order, order_number: orderNumber, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-stats'] });
      toast({ title: 'Order created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create order', variant: 'destructive' });
    }
  });
}

export function useUpdateFuelDeliveryOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryOrder> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_orders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-order'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-stats'] });
      toast({ title: 'Order updated' });
    }
  });
}

export function useDeleteFuelDeliveryOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_orders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-stats'] });
      toast({ title: 'Order deleted' });
    }
  });
}

// Trucks hooks
export function useFuelDeliveryTrucks() {
  return useQuery({
    queryKey: ['fuel-delivery-trucks'],
    queryFn: async () => {
      // Fetch trucks with compartment aggregations
      const { data: trucks, error: trucksError } = await (supabase as any)
        .from('fuel_delivery_trucks')
        .select('*')
        .order('truck_number');
      if (trucksError) throw trucksError;
      
      // Fetch all compartments with product info
      const { data: compartments, error: compError } = await supabase
        .from('fuel_delivery_truck_compartments')
        .select(`
          id,
          truck_id, 
          compartment_number,
          compartment_name,
          capacity_gallons, 
          current_level_gallons,
          product:fuel_delivery_products(id, product_name, product_code, fuel_type)
        `)
        .order('compartment_number');
      if (compError) throw compError;
      
      // Group compartments by truck and aggregate
      const truckCompartments = new Map<string, { 
        totalCapacity: number; 
        currentLoad: number;
        compartmentData: TruckCompartmentData[];
      }>();
      
      compartments?.forEach((c: any) => {
        const existing = truckCompartments.get(c.truck_id) || { 
          totalCapacity: 0, 
          currentLoad: 0,
          compartmentData: []
        };
        existing.totalCapacity += Number(c.capacity_gallons) || 0;
        existing.currentLoad += Number(c.current_level_gallons) || 0;
        existing.compartmentData.push({
          id: c.id,
          compartment_number: c.compartment_number,
          compartment_name: c.compartment_name,
          capacity_gallons: Number(c.capacity_gallons) || 0,
          current_level_gallons: Number(c.current_level_gallons) || 0,
          product: c.product
        });
        truckCompartments.set(c.truck_id, existing);
      });
      
      // Merge compartment data into trucks
      return (trucks as FuelDeliveryTruck[]).map(truck => {
        const data = truckCompartments.get(truck.id);
        return {
          ...truck,
          tank_capacity_gallons: data?.totalCapacity ?? truck.tank_capacity_gallons,
          current_fuel_load: data?.currentLoad ?? truck.current_fuel_load ?? 0,
          compartment_data: data?.compartmentData ?? []
        };
      });
    }
  });
}

export function useCreateFuelDeliveryTruck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (truck: Partial<FuelDeliveryTruck>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('fuel_delivery_trucks')
        .insert({ ...truck, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-trucks'] });
      toast({ title: 'Truck added successfully' });
    }
  });
}

export function useUpdateFuelDeliveryTruck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryTruck> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_trucks')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-trucks'] });
      toast({ title: 'Truck updated' });
    }
  });
}

// Drivers hooks
export function useFuelDeliveryDrivers() {
  return useQuery({
    queryKey: ['fuel-delivery-drivers'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_drivers')
        .select('*')
        .order('last_name');
      if (error) throw error;
      return data as FuelDeliveryDriver[];
    }
  });
}

export function useCreateFuelDeliveryDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (driver: Partial<FuelDeliveryDriver>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('fuel_delivery_drivers')
        .insert({ ...driver, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-drivers'] });
      toast({ title: 'Driver added successfully' });
    }
  });
}

export function useUpdateFuelDeliveryDriver() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryDriver> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_drivers')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-drivers'] });
      toast({ title: 'Driver updated' });
    }
  });
}

// Completions hooks
export function useFuelDeliveryCompletions() {
  return useQuery({
    queryKey: ['fuel-delivery-completions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_completions')
        .select(`
          *,
          fuel_delivery_orders(order_number, fuel_delivery_customers(company_name)),
          fuel_delivery_drivers(first_name, last_name),
          fuel_delivery_trucks(truck_number)
        `)
        .order('delivery_date', { ascending: false });
      if (error) throw error;
      return data as FuelDeliveryCompletion[];
    }
  });
}

export function useCreateFuelDeliveryCompletion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (completion: Partial<FuelDeliveryCompletion>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('fuel_delivery_completions')
        .insert({ ...completion, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-completions'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-stats'] });
      toast({ title: 'Delivery completed successfully' });
    }
  });
}

// Routes hooks
export function useFuelDeliveryRoutes() {
  return useQuery({
    queryKey: ['fuel-delivery-routes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_routes')
        .select(`
          *,
          fuel_delivery_drivers(first_name, last_name),
          fuel_delivery_trucks(truck_number)
        `)
        .order('route_date', { ascending: false });
      if (error) throw error;
      return data as FuelDeliveryRoute[];
    }
  });
}

export function useCreateFuelDeliveryRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (route: Partial<FuelDeliveryRoute>) => {
      const shopId = await getShopId();
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_routes')
        .insert({ ...route, shop_id: shopId })
        .select()
        .single();
      if (error) throw error;
      return data as FuelDeliveryRoute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-routes'] });
      toast({ title: 'Route created successfully' });
    }
  });
}

export function useUpdateFuelDeliveryRoute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryRoute> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_routes')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-routes'] });
      toast({ title: 'Route updated' });
    }
  });
}

// Invoices hooks
export function useFuelDeliveryInvoices() {
  return useQuery({
    queryKey: ['fuel-delivery-invoices'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_invoices')
        .select('*, fuel_delivery_customers(company_name, contact_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FuelDeliveryInvoice[];
    }
  });
}

export function useCreateFuelDeliveryInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoice: Partial<FuelDeliveryInvoice>) => {
      const shopId = await getShopId();
      const invoiceNumber = `FDI-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await (supabase as any)
        .from('fuel_delivery_invoices')
        .insert({ ...invoice, invoice_number: invoiceNumber, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-invoices'] });
      toast({ title: 'Invoice created successfully' });
    }
  });
}

export function useUpdateFuelDeliveryInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryInvoice> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_invoices')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-invoices'] });
      toast({ title: 'Invoice updated' });
    }
  });
}

// Inventory hooks
export function useFuelDeliveryInventory() {
  return useQuery({
    queryKey: ['fuel-delivery-inventory'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_inventory')
        .select('*, fuel_delivery_products(product_name, fuel_type)')
        .order('storage_tank_name');
      if (error) throw error;
      return data as FuelDeliveryInventory[];
    }
  });
}

export function useCreateFuelDeliveryInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inventory: Partial<FuelDeliveryInventory>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('fuel_delivery_inventory')
        .insert({ ...inventory, shop_id: shopId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-inventory'] });
      toast({ title: 'Tank added successfully' });
    }
  });
}

export function useUpdateFuelDeliveryInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FuelDeliveryInventory> & { id: string }) => {
      const { error } = await (supabase as any)
        .from('fuel_delivery_inventory')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-inventory'] });
      toast({ title: 'Inventory updated' });
    }
  });
}

// Price History types and hooks
export interface FuelDeliveryPriceHistory {
  id: string;
  shop_id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  change_reason?: string;
  changed_by?: string;
  effective_date: string;
}

export function useFuelDeliveryPriceHistory() {
  return useQuery({
    queryKey: ['fuel-delivery-price-history'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_price_history')
        .select('*')
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return data as FuelDeliveryPriceHistory[];
    }
  });
}

export function useCreateFuelDeliveryPriceHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (record: Partial<FuelDeliveryPriceHistory>) => {
      const shopId = await getShopId();
      const { error } = await (supabase as any)
        .from('fuel_delivery_price_history')
        .insert({ ...record, shop_id: shopId, effective_date: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-price-history'] });
    }
  });
}

// Quote types and hooks
export interface FuelDeliveryQuote {
  id: string;
  shop_id: string;
  customer_id?: string;
  location_id?: string;
  quote_number: string;
  quote_date: string;
  valid_until?: string;
  status: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  notes?: string;
  terms?: string;
  converted_to_order_id?: string;
  converted_at?: string;
  created_at: string;
  fuel_delivery_customers?: FuelDeliveryCustomer;
}

export interface FuelDeliveryQuoteLine {
  id: string;
  quote_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  sort_order: number;
}

export function useFuelDeliveryQuotes() {
  return useQuery({
    queryKey: ['fuel-delivery-quotes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('fuel_delivery_quotes')
        .select('*, fuel_delivery_customers(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FuelDeliveryQuote[];
    }
  });
}

export function useCreateFuelDeliveryQuote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<FuelDeliveryQuote> & { lines?: any[] }) => {
      const shopId = await getShopId();
      const { lines, ...quoteData } = data;
      
      // Create the quote
      const { data: quote, error: quoteError } = await (supabase as any)
        .from('fuel_delivery_quotes')
        .insert({ ...quoteData, shop_id: shopId })
        .select()
        .single();
      
      if (quoteError) throw quoteError;
      
      // Create line items if provided
      if (lines && lines.length > 0) {
        const lineItems = lines.map(line => ({
          quote_id: quote.id,
          product_id: line.product_id || null,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total_price: line.total_price,
          sort_order: line.sort_order || 0
        }));
        
        const { error: linesError } = await (supabase as any)
          .from('fuel_delivery_quote_lines')
          .insert(lineItems);
        
        if (linesError) throw linesError;
      }
      
      return quote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-quotes'] });
      toast({ title: 'Quote created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create quote', description: String(error), variant: 'destructive' });
    }
  });
}

export function useConvertQuoteToOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const shopId = await getShopId();
      
      // Get the quote with lines
      const { data: quote, error: quoteError } = await (supabase as any)
        .from('fuel_delivery_quotes')
        .select('*, fuel_delivery_quote_lines(*)')
        .eq('id', quoteId)
        .single();
      
      if (quoteError) throw quoteError;
      
      // Create the order
      const { data: order, error: orderError } = await (supabase as any)
        .from('fuel_delivery_orders')
        .insert({
          shop_id: shopId,
          order_number: `ORD-${Date.now().toString().slice(-6)}`,
          customer_id: quote.customer_id,
          location_id: quote.location_id,
          order_date: new Date().toISOString(),
          quantity_ordered: quote.fuel_delivery_quote_lines?.reduce((sum: number, l: any) => sum + l.quantity, 0) || 0,
          subtotal: quote.subtotal,
          tax_amount: quote.tax_amount,
          total_amount: quote.total_amount,
          status: 'pending',
          special_instructions: quote.notes
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Update quote status
      await (supabase as any)
        .from('fuel_delivery_quotes')
        .update({
          status: 'converted',
          converted_to_order_id: order.id,
          converted_at: new Date().toISOString()
        })
        .eq('id', quoteId);
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-orders'] });
      toast({ title: 'Quote converted to order successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to convert quote', description: String(error), variant: 'destructive' });
    }
  });
}
