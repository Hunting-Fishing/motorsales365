
import { supabase } from '@/integrations/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';

export interface Vehicle {
  id: string;
  customer_id?: string; // Now optional for company assets
  owner_type: 'customer' | 'company';
  equipment_type?: 'vehicle' | 'generator' | 'forklift' | 'semi_truck' | 'small_engine' | 'outboard_motor' | 'marine_equipment' | 'heavy_equipment' | 'trailer' | 'rv' | 'atv_utv' | 'other';
  asset_category?: 'courtesy' | 'rental' | 'fleet' | 'service' | 'equipment' | 'other';
  asset_status?: 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'retired';
  checked_out_to?: string;
  checked_out_at?: string;
  expected_return_date?: string;
  current_location?: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  license_plate?: string;
  color?: string;
  mileage?: number;
  engine_size?: string;
  transmission_type?: string;
  fuel_type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleInput {
  customer_id?: string; // Optional for company assets
  owner_type: 'customer' | 'company';
  equipment_type?: 'vehicle' | 'generator' | 'forklift' | 'semi_truck' | 'small_engine' | 'outboard_motor' | 'marine_equipment' | 'heavy_equipment' | 'trailer' | 'rv' | 'atv_utv' | 'other';
  asset_category?: 'courtesy' | 'rental' | 'fleet' | 'service' | 'equipment' | 'other';
  asset_status?: 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'retired';
  checked_out_to?: string;
  checked_out_at?: string;
  expected_return_date?: string;
  current_location?: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  license_plate?: string;
  color?: string;
  mileage?: number;
  engine_size?: string;
  transmission_type?: string;
  fuel_type?: string;
  notes?: string;
}

export interface UpdateVehicleInput {
  customer_id?: string;
  owner_type?: 'customer' | 'company';
  equipment_type?: 'vehicle' | 'generator' | 'forklift' | 'semi_truck' | 'small_engine' | 'outboard_motor' | 'marine_equipment' | 'heavy_equipment' | 'trailer' | 'rv' | 'atv_utv' | 'other';
  asset_category?: 'courtesy' | 'rental' | 'fleet' | 'service' | 'equipment' | 'other';
  asset_status?: 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'retired';
  checked_out_to?: string;
  checked_out_at?: string;
  expected_return_date?: string;
  current_location?: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  license_plate?: string;
  color?: string;
  mileage?: number;
  engine_size?: string;
  transmission_type?: string;
  fuel_type?: string;
  notes?: string;
}

export class VehicleRepository {
  async findAll(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw this.handleError(error);
    return (data || []) as Vehicle[];
  }

  async findById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw this.handleError(error);
    return data as Vehicle | null;
  }

  async findByCustomer(customerId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) throw this.handleError(error);
    return (data || []) as Vehicle[];
  }

  async findByVin(vin: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('vin', vin)
      .single();
    
    if (error && error.code !== 'PGRST116') throw this.handleError(error);
    return data as Vehicle | null;
  }

  async findByLicensePlate(licensePlate: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('license_plate', licensePlate)
      .single();
    
    if (error && error.code !== 'PGRST116') throw this.handleError(error);
    return data as Vehicle | null;
  }

  async create(entity: CreateVehicleInput): Promise<Vehicle> {
    // Ensure all required fields are present for Supabase
    const insertData = {
      customer_id: entity.customer_id || null,
      owner_type: entity.owner_type,
      equipment_type: entity.equipment_type || null,
      asset_category: entity.asset_category || null,
      asset_status: entity.asset_status || null,
      checked_out_to: entity.checked_out_to || null,
      checked_out_at: entity.checked_out_at || null,
      expected_return_date: entity.expected_return_date || null,
      current_location: entity.current_location || null,
      year: entity.year || null,
      make: entity.make || null,
      model: entity.model || null,
      vin: entity.vin || null,
      license_plate: entity.license_plate || null,
      color: entity.color || null,
      mileage: entity.mileage || null,
      engine_size: entity.engine_size || null,
      transmission_type: entity.transmission_type || null,
      fuel_type: entity.fuel_type || null,
      notes: entity.notes || null,
    };

    const { data, error } = await supabase
      .from('vehicles')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw this.handleError(error);
    return data as Vehicle;
  }

  async update(id: string, updates: UpdateVehicleInput): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw this.handleError(error);
    return data as Vehicle;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    
    if (error) throw this.handleError(error);
  }

  async searchVehicles(searchTerm: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .or(`make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,vin.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw this.handleError(error);
    return (data || []) as Vehicle[];
  }

  // Add method to find company assets only
  async findCompanyAssets(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('owner_type', 'company')
      .order('created_at', { ascending: false });
    
    if (error) throw this.handleError(error);
    return (data || []) as Vehicle[];
  }

  private handleError(error: PostgrestError): Error {
    console.error('Database error in vehicles:', error);
    return new Error(`Vehicle operation failed: ${error.message}`);
  }
}
