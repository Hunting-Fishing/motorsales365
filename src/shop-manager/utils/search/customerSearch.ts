
import { Customer } from "@/types/customer";

interface DateRange {
  from?: Date;
  to?: Date;
}

interface FilterOptions {
  query?: string;
  tags?: string[];
  segments?: string[];
  status?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  hasVehicles?: string;
  vehicleType?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Filter customers based on provided filter options
 */
export const filterCustomers = (customers: Customer[], filters: FilterOptions): Customer[] => {
  if (!customers || !customers.length) return [];
  
  return customers.filter(customer => {
    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
      const searchFields = [
        fullName,
        customer.email?.toLowerCase() || '',
        customer.phone?.toLowerCase() || '',
        customer.company?.toLowerCase() || '',
      ];
      
      const matchesQuery = searchFields.some(field => field.includes(query));
      if (!matchesQuery) return false;
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const customerTags = customer.tags || [];
      const hasMatchingTag = filters.tags.some(tag => customerTags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    
    // Segments filter
    if (filters.segments && filters.segments.length > 0) {
      const customerSegments = customer.segments || [];
      const hasMatchingSegment = filters.segments.some(segment => customerSegments.includes(segment));
      if (!hasMatchingSegment) return false;
    }
    
    // Status filter
    if (filters.status && filters.status !== '_any') {
      if (customer.status !== filters.status) return false;
    }
    
    // Date range filter
    if (filters.dateRange && (filters.dateRange.startDate || filters.dateRange.endDate)) {
      const customerDate = new Date(customer.created_at || customer.updated_at);
      
      if (filters.dateRange.startDate) {
        const startDate = new Date(filters.dateRange.startDate);
        if (customerDate < startDate) return false;
      }
      
      if (filters.dateRange.endDate) {
        const endDate = new Date(filters.dateRange.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (customerDate > endDate) return false;
      }
    }
    
    // Has vehicles filter
    if (filters.hasVehicles && filters.hasVehicles !== '_any') {
      const hasVehicles = (customer.vehicles?.length || 0) > 0;
      if (filters.hasVehicles === 'yes' && !hasVehicles) return false;
      if (filters.hasVehicles === 'no' && hasVehicles) return false;
    }
    
    // Vehicle type filter
    if (filters.vehicleType && filters.vehicleType !== '_any') {
      const vehicles = customer.vehicles || [];
      const hasVehicleType = vehicles.some(vehicle => 
        vehicle.body_style?.toLowerCase() === filters.vehicleType?.toLowerCase()
      );
      if (!hasVehicleType) return false;
    }
    
    return true;
  });
};

/**
 * Create an empty customer filters object
 */
export const createEmptyFilters = (): FilterOptions => ({
  query: '',
  tags: [],
  segments: [],
  status: '_any',
  dateRange: {
    startDate: '',
    endDate: ''
  },
  hasVehicles: '_any',
  vehicleType: '_any',
  sortField: 'name',
  sortDirection: 'asc'
});

/**
 * Convert a DateRange object to the format expected by FilterOptions
 */
export const convertDateRange = (range: DateRange): { startDate: string, endDate: string } => {
  return {
    startDate: range.from ? range.from.toISOString().split('T')[0] : '',
    endDate: range.to ? range.to.toISOString().split('T')[0] : ''
  };
};

/**
 * Interface for vehicle types used in customer data
 */
interface CustomerVehicle {
  id: string;
  make: string;
  model: string;
  year: number | string;
  body_style?: string;
  type?: string;
}
