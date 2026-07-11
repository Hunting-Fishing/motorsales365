import { supabase } from '@/integrations/supabase/client';

export interface TeamDepartment {
  id: string;
  shop_id: string;
  name: string;
  description?: string;
  parent_department_id?: string;
  department_head_id?: string;
  budget_limit?: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamLocation {
  id: string;
  shop_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
  location_type: 'office' | 'warehouse' | 'garage' | 'field' | 'remote';
  capacity?: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamCertification {
  id: string;
  shop_id: string;
  profile_id: string;
  certification_name: string;
  certification_authority: string;
  certification_number?: string;
  issue_date: string;
  expiry_date?: string;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
  attachment_url?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const teamService = {
  // Departments
  async getDepartments(): Promise<TeamDepartment[]> {
    const { data, error } = await supabase
      .from('team_departments')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }

    return (data as TeamDepartment[]) || [];
  },

  async createDepartment(department: Omit<TeamDepartment, 'id' | 'created_at' | 'updated_at'>): Promise<TeamDepartment> {
    const { data, error } = await supabase
      .from('team_departments')
      .insert(department)
      .select()
      .single();

    if (error) {
      console.error('Error creating department:', error);
      throw error;
    }

    return data as TeamDepartment;
  },

  async updateDepartment(id: string, updates: Partial<TeamDepartment>): Promise<TeamDepartment> {
    const { data, error } = await supabase
      .from('team_departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating department:', error);
      throw error;
    }

    return data as TeamDepartment;
  },

  async deleteDepartment(id: string): Promise<void> {
    const { error } = await supabase
      .from('team_departments')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  },

  // Locations
  async getLocations(): Promise<TeamLocation[]> {
    const { data, error } = await supabase
      .from('team_locations')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }

    return (data as TeamLocation[]) || [];
  },

  async createLocation(location: Omit<TeamLocation, 'id' | 'created_at' | 'updated_at'>): Promise<TeamLocation> {
    const { data, error } = await supabase
      .from('team_locations')
      .insert(location)
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      throw error;
    }

    return data as TeamLocation;
  },

  async updateLocation(id: string, updates: Partial<TeamLocation>): Promise<TeamLocation> {
    const { data, error } = await supabase
      .from('team_locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error);
      throw error;
    }

    return data as TeamLocation;
  },

  async deleteLocation(id: string): Promise<void> {
    const { error } = await supabase
      .from('team_locations')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  },

  // Certifications
  async getCertifications(): Promise<TeamCertification[]> {
    const { data, error } = await supabase
      .from('team_certifications')
      .select('*')
      .order('issue_date', { ascending: false });

    if (error) {
      console.error('Error fetching certifications:', error);
      throw error;
    }

    return (data as TeamCertification[]) || [];
  },

  async getCertificationsByProfile(profileId: string): Promise<TeamCertification[]> {
    const { data, error } = await supabase
      .from('team_certifications')
      .select('*')
      .eq('profile_id', profileId)
      .order('issue_date', { ascending: false });

    if (error) {
      console.error('Error fetching certifications by profile:', error);
      throw error;
    }

    return (data as TeamCertification[]) || [];
  },

  async createCertification(certification: Omit<TeamCertification, 'id' | 'created_at' | 'updated_at'>): Promise<TeamCertification> {
    const { data, error } = await supabase
      .from('team_certifications')
      .insert(certification)
      .select()
      .single();

    if (error) {
      console.error('Error creating certification:', error);
      throw error;
    }

    return data as TeamCertification;
  },

  async updateCertification(id: string, updates: Partial<TeamCertification>): Promise<TeamCertification> {
    const { data, error } = await supabase
      .from('team_certifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating certification:', error);
      throw error;
    }

    return data as TeamCertification;
  },

  async deleteCertification(id: string): Promise<void> {
    const { error } = await supabase
      .from('team_certifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting certification:', error);
      throw error;
    }
  },

  // Helper methods for filters
  async getDepartmentOptions(): Promise<Array<{ value: string; label: string }>> {
    const departments = await this.getDepartments();
    return departments.map(dept => ({
      value: dept.id,
      label: dept.name
    }));
  },

  async getLocationOptions(): Promise<Array<{ value: string; label: string }>> {
    const locations = await this.getLocations();
    return locations.map(location => ({
      value: location.id,
      label: location.name
    }));
  },

  async getLocationTypeOptions(): Promise<Array<{ value: string; label: string }>> {
    return [
      { value: 'office', label: 'Office' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'garage', label: 'Garage' },
      { value: 'field', label: 'Field' },
      { value: 'remote', label: 'Remote' }
    ];
  }
};