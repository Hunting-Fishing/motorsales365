
// Service hierarchy types and utilities
export interface ServiceJob {
  id: string;
  name: string;
  description?: string;
  estimatedTime?: number; // in minutes
  price?: number;
}

export interface ServiceSubcategory {
  id: string;
  name: string;
  description?: string;
  jobs: ServiceJob[];
}

export interface ServiceMainCategory {
  id: string;
  name: string;
  description?: string;
  subcategories: ServiceSubcategory[];
  position?: number;
}

// Common service categories for automotive shops
export const commonServiceCategories: ServiceMainCategory[] = [
  {
    id: '1',
    name: 'Oil Change & Maintenance',
    description: 'Regular maintenance services',
    position: 1,
    subcategories: [
      {
        id: '1-1',
        name: 'Oil Changes',
        jobs: [
          { id: '1-1-1', name: 'Standard Oil Change', estimatedTime: 30, price: 35 },
          { id: '1-1-2', name: 'Synthetic Oil Change', estimatedTime: 30, price: 65 },
          { id: '1-1-3', name: 'High Mileage Oil Change', estimatedTime: 30, price: 45 }
        ]
      },
      {
        id: '1-2',
        name: 'Filter Services',
        jobs: [
          { id: '1-2-1', name: 'Air Filter Replacement', estimatedTime: 15, price: 25 },
          { id: '1-2-2', name: 'Cabin Filter Replacement', estimatedTime: 20, price: 30 },
          { id: '1-2-3', name: 'Fuel Filter Replacement', estimatedTime: 45, price: 65 }
        ]
      }
    ]
  },
  {
    id: '2',
    name: 'Brakes',
    description: 'Brake system services',
    position: 2,
    subcategories: [
      {
        id: '2-1',
        name: 'Brake Pads',
        jobs: [
          { id: '2-1-1', name: 'Front Brake Pad Replacement', estimatedTime: 90, price: 150 },
          { id: '2-1-2', name: 'Rear Brake Pad Replacement', estimatedTime: 90, price: 140 }
        ]
      }
    ]
  },
  {
    id: '3',
    name: 'Tires',
    description: 'Tire services',
    position: 3,
    subcategories: [
      {
        id: '3-1',
        name: 'Tire Installation',
        jobs: [
          { id: '3-1-1', name: 'Tire Mount & Balance', estimatedTime: 60, price: 80 },
          { id: '3-1-2', name: 'Tire Rotation', estimatedTime: 30, price: 25 }
        ]
      }
    ]
  }
];

export const getServiceCategories = () => commonServiceCategories;
export const getServiceJobs = () => {
  return commonServiceCategories.flatMap(category => 
    category.subcategories.flatMap(subcategory => subcategory.jobs)
  );
};
