import { useState, useMemo } from 'react';
import { ServiceMainCategory, ServiceJob } from '@/types/service';

export interface ServiceFilters {
  searchTerm: string;
  searchScope: 'all' | 'name' | 'description' | 'category';
  selectedCategories: string[];
  priceRange: [number, number];
  timeRange: [number, number];
  hasPrice: boolean | null;
  hasEstimatedTime: boolean | null;
  sortBy: 'name' | 'price' | 'time' | 'category';
  sortOrder: 'asc' | 'desc';
}

export const defaultFilters: ServiceFilters = {
  searchTerm: '',
  searchScope: 'all',
  selectedCategories: [],
  priceRange: [0, 1000],
  timeRange: [0, 480],
  hasPrice: null,
  hasEstimatedTime: null,
  sortBy: 'name',
  sortOrder: 'asc'
};

export const useServiceFiltering = (categories: ServiceMainCategory[]) => {
  const [filters, setFilters] = useState<ServiceFilters>(defaultFilters);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const toggleFiltersExpanded = () => {
    setIsFiltersExpanded(!isFiltersExpanded);
  };

  // Flatten all services for filtering
  const allServices = useMemo(() => {
    const services: Array<ServiceJob & { categoryName: string; subcategoryName: string; categoryId: string; subcategoryId: string }> = [];
    
    categories.forEach(category => {
      category.subcategories.forEach(subcategory => {
        subcategory.jobs.forEach(job => {
          services.push({
            ...job,
            categoryName: category.name,
            subcategoryName: subcategory.name,
            categoryId: category.id,
            subcategoryId: subcategory.id
          });
        });
      });
    });
    
    return services;
  }, [categories]);

  // Filter and sort services
  const filteredServices = useMemo(() => {
    let filtered = allServices;

    // Text search
    if (filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(service => {
        switch (filters.searchScope) {
          case 'name':
            return service.name.toLowerCase().includes(searchTerm);
          case 'description':
            return service.description?.toLowerCase().includes(searchTerm) || false;
          case 'category':
            return service.categoryName.toLowerCase().includes(searchTerm) ||
                   service.subcategoryName.toLowerCase().includes(searchTerm);
          case 'all':
          default:
            return service.name.toLowerCase().includes(searchTerm) ||
                   service.description?.toLowerCase().includes(searchTerm) ||
                   service.categoryName.toLowerCase().includes(searchTerm) ||
                   service.subcategoryName.toLowerCase().includes(searchTerm);
        }
      });
    }

    // Category filter
    if (filters.selectedCategories.length > 0) {
      filtered = filtered.filter(service => 
        filters.selectedCategories.includes(service.categoryId)
      );
    }

    // Price filter
    if (filters.hasPrice === true) {
      filtered = filtered.filter(service => service.price !== undefined && service.price !== null);
    } else if (filters.hasPrice === false) {
      filtered = filtered.filter(service => service.price === undefined || service.price === null);
    }

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) {
      filtered = filtered.filter(service => {
        if (!service.price) return filters.priceRange[0] === 0;
        return service.price >= filters.priceRange[0] && service.price <= filters.priceRange[1];
      });
    }

    // Time filter
    if (filters.hasEstimatedTime === true) {
      filtered = filtered.filter(service => service.estimatedTime !== undefined && service.estimatedTime !== null);
    } else if (filters.hasEstimatedTime === false) {
      filtered = filtered.filter(service => service.estimatedTime === undefined || service.estimatedTime === null);
    }

    if (filters.timeRange[0] > 0 || filters.timeRange[1] < 480) {
      filtered = filtered.filter(service => {
        if (!service.estimatedTime) return filters.timeRange[0] === 0;
        return service.estimatedTime >= filters.timeRange[0] && service.estimatedTime <= filters.timeRange[1];
      });
    }

    // Sort services
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          const priceA = a.price || 0;
          const priceB = b.price || 0;
          comparison = priceA - priceB;
          break;
        case 'time':
          const timeA = a.estimatedTime || 0;
          const timeB = b.estimatedTime || 0;
          comparison = timeA - timeB;
          break;
        case 'category':
          comparison = a.categoryName.localeCompare(b.categoryName) ||
                      a.subcategoryName.localeCompare(b.subcategoryName);
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [allServices, filters]);

  // Filter categories based on current filters
  const filteredCategories = useMemo(() => {
    if (!filters.searchTerm && filters.selectedCategories.length === 0) {
      return categories;
    }

    return categories.map(category => {
      const filteredSubcategories = category.subcategories.map(subcategory => {
        const filteredJobs = subcategory.jobs.filter(job => {
          const serviceWithMeta = {
            ...job,
            categoryName: category.name,
            subcategoryName: subcategory.name,
            categoryId: category.id,
            subcategoryId: subcategory.id
          };
          return filteredServices.some(fs => 
            fs.id === job.id && 
            fs.categoryId === category.id && 
            fs.subcategoryId === subcategory.id
          );
        });

        return {
          ...subcategory,
          jobs: filteredJobs
        };
      }).filter(subcategory => subcategory.jobs.length > 0);

      return {
        ...category,
        subcategories: filteredSubcategories
      };
    }).filter(category => category.subcategories.length > 0);
  }, [categories, filteredServices, filters.searchTerm, filters.selectedCategories]);

  return {
    filters,
    setFilters,
    resetFilters,
    isFiltersExpanded,
    toggleFiltersExpanded,
    filteredServices,
    filteredCategories,
    totalServicesCount: allServices.length,
    filteredServicesCount: filteredServices.length
  };
};
