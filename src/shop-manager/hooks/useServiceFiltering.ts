import { useState, useMemo } from 'react';
import { ServiceMainCategory, ServiceJob } from '@/types/service';

export interface ServiceFilters {
  searchQuery: string;
  selectedCategories: string[];
  priceRange: [number, number];
  hasEstimatedTime: boolean;
  hasPrice: boolean;
  subcategoryFilter: string;
  sortBy: 'name' | 'price' | 'estimatedTime' | 'category';
  sortOrder: 'asc' | 'desc';
}

const defaultFilters: ServiceFilters = {
  searchQuery: '',
  selectedCategories: [],
  priceRange: [0, 1000],
  hasEstimatedTime: false,
  hasPrice: false,
  subcategoryFilter: '',
  sortBy: 'name',
  sortOrder: 'asc'
};

export function useServiceFiltering(categories: ServiceMainCategory[]) {
  const [filters, setFilters] = useState<ServiceFilters>(defaultFilters);

  // Get all jobs with their parent information
  const allJobs = useMemo(() => {
    const jobs: (ServiceJob & { 
      categoryId: string;
      categoryName: string;
      subcategoryId: string;
      subcategoryName: string;
    })[] = [];

    categories.forEach(category => {
      category.subcategories.forEach(subcategory => {
        subcategory.jobs.forEach(job => {
          jobs.push({
            ...job,
            categoryId: category.id,
            categoryName: category.name,
            subcategoryId: subcategory.id,
            subcategoryName: subcategory.name
          });
        });
      });
    });

    return jobs;
  }, [categories]);

  // Apply filters to jobs
  const filteredJobs = useMemo(() => {
    let filtered = allJobs;

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(job =>
        job.name.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.categoryName.toLowerCase().includes(query) ||
        job.subcategoryName.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.selectedCategories.length > 0) {
      filtered = filtered.filter(job =>
        filters.selectedCategories.includes(job.categoryId)
      );
    }

    // Price range filter
    filtered = filtered.filter(job => {
      if (!job.price) return true; // Include jobs without price
      return job.price >= filters.priceRange[0] && job.price <= filters.priceRange[1];
    });

    // Has price filter
    if (filters.hasPrice) {
      filtered = filtered.filter(job => job.price !== null && job.price !== undefined);
    }

    // Has estimated time filter
    if (filters.hasEstimatedTime) {
      filtered = filtered.filter(job => job.estimatedTime !== null && job.estimatedTime !== undefined);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'estimatedTime':
          comparison = (a.estimatedTime || 0) - (b.estimatedTime || 0);
          break;
        case 'category':
          comparison = a.categoryName.localeCompare(b.categoryName);
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [allJobs, filters]);

  // Get filter statistics
  const filterStats = useMemo(() => {
    return {
      totalJobs: allJobs.length,
      filteredJobs: filteredJobs.length,
      jobsWithPrice: allJobs.filter(job => job.price).length,
      jobsWithTime: allJobs.filter(job => job.estimatedTime).length,
      categoriesWithJobs: new Set(allJobs.map(job => job.categoryId)).size
    };
  }, [allJobs, filteredJobs]);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const updateFilters = (newFilters: ServiceFilters) => {
    setFilters(newFilters);
  };

  return {
    filters,
    filteredJobs,
    filterStats,
    updateFilters,
    resetFilters,
    allJobs
  };
}
