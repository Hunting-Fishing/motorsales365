import { useState } from 'react';
import { searchParts, getPartCategories, getPartSuppliers, type PartsSearchFilters, type PartsSearchResult } from '@/services/parts/partsService';

export function usePartsSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = async (
    filters: PartsSearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<PartsSearchResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await searchParts(filters, limit, offset);
      return result;
    } catch (err) {
      const errorMessage = 'Failed to search parts';
      setError(errorMessage);
      console.error('Parts search error:', err);
      return { parts: [], totalCount: 0 };
    } finally {
      setLoading(false);
    }
  };

  const getCategories = async (): Promise<string[]> => {
    try {
      return await getPartCategories();
    } catch (err) {
      console.error('Error fetching categories:', err);
      return [];
    }
  };

  const getSuppliers = async (): Promise<string[]> => {
    try {
      return await getPartSuppliers();
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      return [];
    }
  };

  return {
    searchParts: performSearch,
    getPartCategories: getCategories,
    getPartSuppliers: getSuppliers,
    loading,
    error
  };
}