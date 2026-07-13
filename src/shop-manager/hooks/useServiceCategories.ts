
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ServiceMainCategory, ServiceSubcategory, ServiceJob, ServiceSector } from '@/types/service';
import { fetchServiceSectors, fetchServiceCategories } from '@/lib/services/serviceApi';

export const useServiceCategories = () => {
  const [categories, setCategories] = useState<ServiceMainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceCategoriesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching service categories...');

      const categoriesData = await fetchServiceCategories();
      console.log('Service categories loaded:', categoriesData.length);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Error fetching service categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch service categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceCategoriesData();
  }, [fetchServiceCategoriesData]);

  return {
    categories,
    loading,
    error,
    refetch: fetchServiceCategoriesData
  };
};

export const useServiceSectors = () => {
  const [sectors, setSectors] = useState<ServiceSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServiceSectorsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching service sectors...');

      // Force fresh data by adding timestamp to avoid caching
      const sectorsData = await fetchServiceSectors();
      console.log('Service sectors loaded:', sectorsData.length);
      
      if (sectorsData.length > 0) {
        const totalCategories = sectorsData.reduce((acc, sector) => acc + sector.categories.length, 0);
        const totalServices = sectorsData.reduce((acc, sector) => 
          acc + sector.categories.reduce((catAcc, category) => 
            catAcc + category.subcategories.reduce((subAcc, subcategory) => 
              subAcc + subcategory.jobs.length, 0), 0), 0);
        
        console.log(`Loaded ${sectorsData.length} sectors, ${totalCategories} categories, ${totalServices} services`);
      }
      
      setSectors(sectorsData);
    } catch (err) {
      console.error('Error fetching service sectors:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch service sectors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceSectorsData();
  }, [fetchServiceSectorsData]);

  return {
    sectors,
    loading,
    error,
    refetch: fetchServiceSectorsData
  };
};
