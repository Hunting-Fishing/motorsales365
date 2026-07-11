import { supabase } from '@/integrations/supabase/client';

export interface APIEndpoint {
  id: string;
  integration_id: string;
  name: string;
  endpoint_url: string;
  method: string;
  headers: any;
  parameters: any;
  description?: string;
  is_active: boolean;
  last_called_at?: string;
  response_time_ms?: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ShopIntegration {
  id: string;
  shop_id: string;
  provider_id: string;
  name: string;
  description?: string;
  auth_credentials?: any;
  configuration?: any;
  sync_settings?: any;
  last_sync_at?: string;
  sync_status?: string;
  error_details?: string;
  is_active?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// API Endpoints
export const fetchAPIEndpoints = async (integrationId?: string): Promise<APIEndpoint[]> => {
  try {
    let query = supabase
      .from('api_endpoints')
      .select('*')
      .order('created_at', { ascending: false });

    if (integrationId) {
      query = query.eq('integration_id', integrationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching API endpoints:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching API endpoints:', error);
    return [];
  }
};

export const createAPIEndpoint = async (endpoint: Omit<APIEndpoint, 'id' | 'created_at' | 'updated_at'>): Promise<APIEndpoint | null> => {
  try {
    const { data, error } = await supabase
      .from('api_endpoints')
      .insert([endpoint])
      .select()
      .single();

    if (error) {
      console.error('Error creating API endpoint:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating API endpoint:', error);
    return null;
  }
};

export const updateAPIEndpoint = async (id: string, updates: Partial<APIEndpoint>): Promise<APIEndpoint | null> => {
  try {
    const { data, error } = await supabase
      .from('api_endpoints')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating API endpoint:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating API endpoint:', error);
    return null;
  }
};

export const deleteAPIEndpoint = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('api_endpoints')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting API endpoint:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting API endpoint:', error);
    return false;
  }
};

export const testAPIEndpoint = async (endpoint: APIEndpoint): Promise<{ success: boolean; responseTime: number; error?: string }> => {
  try {
    const startTime = Date.now();
    
    const response = await fetch(endpoint.endpoint_url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        ...endpoint.headers
      },
      body: endpoint.method !== 'GET' ? JSON.stringify(endpoint.parameters) : undefined
    });

    const responseTime = Date.now() - startTime;
    
    // Update endpoint with last call info
    await updateAPIEndpoint(endpoint.id, {
      last_called_at: new Date().toISOString(),
      response_time_ms: responseTime
    });

    return {
      success: response.ok,
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
    };
  } catch (error) {
    console.error('Error testing API endpoint:', error);
    return {
      success: false,
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Shop Integrations
export const fetchShopIntegrations = async (): Promise<ShopIntegration[]> => {
  try {
    const { data, error } = await supabase
      .from('shop_integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shop integrations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching shop integrations:', error);
    return [];
  }
};

export const createShopIntegration = async (integration: Omit<ShopIntegration, 'id' | 'created_at' | 'updated_at'>): Promise<ShopIntegration | null> => {
  try {
    const { data, error } = await supabase
      .from('shop_integrations')
      .insert([integration])
      .select()
      .single();

    if (error) {
      console.error('Error creating shop integration:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error creating shop integration:', error);
    return null;
  }
};

export const updateShopIntegration = async (id: string, updates: Partial<ShopIntegration>): Promise<ShopIntegration | null> => {
  try {
    const { data, error } = await supabase
      .from('shop_integrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating shop integration:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error updating shop integration:', error);
    return null;
  }
};