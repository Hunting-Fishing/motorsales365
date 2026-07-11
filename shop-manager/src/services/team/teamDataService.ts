import { supabase } from '@/integrations/supabase/client';

export interface TeamFilterData {
  departments: string[];
  roles: string[];
  locations: string[];
}

export const teamDataService = {
  /**
   * Get all departments for the current user's shop
   */
  async getDepartments(): Promise<string[]> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) return [];

      const { data: departments, error } = await supabase
        .from('team_departments')
        .select('name')
        .eq('shop_id', profile.shop_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching departments:', error);
        return [];
      }

      return departments?.map(d => d.name) || [];
    } catch (error) {
      console.error('Error in getDepartments:', error);
      return [];
    }
  },

  /**
   * Get all roles from the roles table
   */
  async getRoles(): Promise<string[]> {
    try {
      const { data: roles, error } = await supabase
        .from('roles')
        .select('name')
        .order('name');

      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }

      return roles?.map(r => r.name) || [];
    } catch (error) {
      console.error('Error in getRoles:', error);
      return [];
    }
  },

  /**
   * Get all locations for the current user's shop
   */
  async getLocations(): Promise<string[]> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) return [];

      const { data: locations, error } = await supabase
        .from('team_locations')
        .select('name')
        .eq('shop_id', profile.shop_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching locations:', error);
        return [];
      }

      return locations?.map(l => l.name) || [];
    } catch (error) {
      console.error('Error in getLocations:', error);
      return [];
    }
  },

  /**
   * Get all filter data at once for better performance
   */
  async getAllFilterData(): Promise<TeamFilterData> {
    try {
      const [departments, roles, locations] = await Promise.all([
        this.getDepartments(),
        this.getRoles(),
        this.getLocations()
      ]);

      return {
        departments,
        roles,
        locations
      };
    } catch (error) {
      console.error('Error fetching team filter data:', error);
      return {
        departments: [],
        roles: [],
        locations: []
      };
    }
  }
};