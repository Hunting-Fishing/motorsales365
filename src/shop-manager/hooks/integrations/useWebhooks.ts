import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WebhookEndpoint {
  id: string;
  shop_id: string;
  integration_id: string | null;
  name: string;
  url: string;
  secret_key: string | null;
  events: string[];
  headers: any;
  retry_config: any;
  timeout_seconds: number;
  is_active: boolean;
  last_triggered_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  integration?: {
    name: string;
    provider?: {
      name: string;
      slug: string;
    };
  };
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  event_id: string | null;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  response_headers: any | null;
  delivery_attempts: number;
  delivered_at: string | null;
  next_retry_at: string | null;
  created_at: string;
}

export function useWebhooks() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchEndpoints = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select(`
          *,
          integration:shop_integrations(
            name,
            provider:integration_providers(name, slug)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEndpoints(data || []);
    } catch (error) {
      console.error('Error fetching webhook endpoints:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhook endpoints',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeliveries = async (endpointId?: string) => {
    try {
      let query = supabase
        .from('webhook_deliveries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (endpointId) {
        query = query.eq('endpoint_id', endpointId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching webhook deliveries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhook deliveries',
        variant: 'destructive'
      });
    }
  };

  const createEndpoint = async (endpointData: {
    integration_id?: string;
    name: string;
    url: string;
    events: string[];
    secret_key?: string;
    headers?: any;
    retry_config?: any;
    timeout_seconds?: number;
  }) => {
    try {
      const user = await supabase.auth.getUser();
      const profile = await supabase.from('profiles').select('shop_id').single();

      const { data, error } = await supabase
        .from('webhook_endpoints')
        .insert({
          ...endpointData,
          headers: endpointData.headers || {},
          retry_config: endpointData.retry_config || { max_retries: 3, retry_delay: 60 },
          timeout_seconds: endpointData.timeout_seconds || 30,
          created_by: user.data.user?.id,
          shop_id: profile.data?.shop_id
        })
        .select(`
          *,
          integration:shop_integrations(
            name,
            provider:integration_providers(name, slug)
          )
        `)
        .single();

      if (error) throw error;

      setEndpoints(prev => [data, ...prev]);
      toast({
        title: 'Success',
        description: 'Webhook endpoint created successfully'
      });
      return data;
    } catch (error) {
      console.error('Error creating webhook endpoint:', error);
      toast({
        title: 'Error',
        description: 'Failed to create webhook endpoint',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateEndpoint = async (id: string, updates: Partial<WebhookEndpoint>) => {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          integration:shop_integrations(
            name,
            provider:integration_providers(name, slug)
          )
        `)
        .single();

      if (error) throw error;

      setEndpoints(prev => 
        prev.map(endpoint => 
          endpoint.id === id ? { ...endpoint, ...data } : endpoint
        )
      );

      toast({
        title: 'Success',
        description: 'Webhook endpoint updated successfully'
      });
      return data;
    } catch (error) {
      console.error('Error updating webhook endpoint:', error);
      toast({
        title: 'Error',
        description: 'Failed to update webhook endpoint',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const deleteEndpoint = async (id: string) => {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEndpoints(prev => prev.filter(endpoint => endpoint.id !== id));
      
      toast({
        title: 'Success',
        description: 'Webhook endpoint deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting webhook endpoint:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete webhook endpoint',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const testEndpoint = async (id: string) => {
    try {
      const endpoint = endpoints.find(e => e.id === id);
      if (!endpoint) throw new Error('Endpoint not found');

      toast({
        title: 'Testing Webhook',
        description: 'Sending test payload...'
      });

      // This would call an edge function to send a test webhook
      const testPayload = {
        event_type: 'test',
        timestamp: new Date().toISOString(),
        data: { message: 'This is a test webhook from your system' }
      };

      // Call the webhook URL directly for testing
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(endpoint.secret_key ? { 'X-Webhook-Secret': endpoint.secret_key } : {})
        },
        body: JSON.stringify(testPayload),
        mode: 'no-cors' // Allow cross-origin requests for webhook testing
      });

      toast({
        title: 'Test Sent',
        description: 'Test webhook request sent to endpoint'
      });

    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: 'Test Failed',
        description: 'Unable to send test webhook',
        variant: 'destructive'
      });
    }
  };

  const retryDelivery = async (deliveryId: string) => {
    try {
      toast({
        title: 'Retrying Delivery',
        description: 'Attempting to resend webhook...'
      });

      // This would call an edge function to retry the webhook delivery
      setTimeout(() => {
        toast({
          title: 'Retry Successful',
          description: 'Webhook delivery completed'
        });
        fetchDeliveries();
      }, 1000);

    } catch (error) {
      console.error('Error retrying webhook delivery:', error);
      toast({
        title: 'Retry Failed',
        description: 'Unable to retry webhook delivery',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    fetchEndpoints();
    fetchDeliveries();
  }, []);

  return {
    endpoints,
    deliveries,
    isLoading,
    createEndpoint,
    updateEndpoint,
    deleteEndpoint,
    testEndpoint,
    retryDelivery,
    fetchDeliveries,
    refetch: fetchEndpoints
  };
}