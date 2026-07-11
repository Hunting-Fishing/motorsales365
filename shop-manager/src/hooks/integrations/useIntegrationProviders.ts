import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface IntegrationProvider {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  logo_url: string | null;
  website_url: string | null;
  documentation_url: string | null;
  api_version: string | null;
  auth_type: string;
  auth_config: any;
  rate_limits: any;
  webhook_support: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useIntegrationProviders() {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('integration_providers')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching integration providers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load integration providers',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProvidersByCategory = () => {
    const categories: Record<string, IntegrationProvider[]> = {};
    providers.forEach(provider => {
      if (!categories[provider.category]) {
        categories[provider.category] = [];
      }
      categories[provider.category].push(provider);
    });
    return categories;
  };

  const getProviderBySlug = (slug: string) => {
    return providers.find(provider => provider.slug === slug);
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return {
    providers,
    isLoading,
    getProvidersByCategory,
    getProviderBySlug,
    refetch: fetchProviders
  };
}