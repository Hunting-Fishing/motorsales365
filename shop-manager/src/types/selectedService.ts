
export interface SelectedService {
  id: string;
  serviceId?: string; // Reference to the original service
  name: string;
  description?: string;
  estimated_hours: number;
  labor_rate: number;
  total_amount: number;
  category: string;
  subcategory: string;
  categoryName?: string; // Alias for category
  subcategoryName?: string; // Alias for subcategory
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  
  // Additional properties for service selection
  estimatedTime?: number; // in minutes
  price?: number;
}

export interface ServiceSelectionSummary {
  totalServices: number;
  totalEstimatedTime: number;
  totalEstimatedCost: number;
  services: SelectedService[];
}
