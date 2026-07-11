
// Consolidated service types - single source of truth
export interface ServiceJob {
  id: string;
  name: string;
  description?: string;
  estimatedTime?: number; // in minutes
  price?: number;
  subcategory_id?: string;
}

export interface ServiceSubcategory {
  id: string;
  name: string;
  description?: string;
  jobs: ServiceJob[];
  category_id?: string;
}

export interface ServiceMainCategory {
  id: string;
  name: string;
  description?: string;
  subcategories: ServiceSubcategory[];
  position?: number;
  sector_id?: string;
}

export interface ServiceSector {
  id: string;
  name: string;
  description?: string;
  categories: ServiceMainCategory[];
  position?: number;
  is_active?: boolean;
}

export interface ServiceHierarchyState {
  sectors: ServiceSector[];
  isLoading: boolean;
  error: string | null;
}

// Excel import types - Updated to match actual structure
export interface ExcelRowData {
  category: string;
  subcategory: string;
  serviceName: string;
  description: string;
  estimatedTime: number;
  price: number;
}

export interface MappedServiceData {
  sectorName: string;
  categories: {
    name: string;
    subcategories: {
      name: string;
      services: {
        name: string;
        description: string;
        estimatedTime: number;
        price: number;
      }[];
    }[];
  }[];
}

// Import progress and results
export interface ImportProgress {
  stage: string;
  message: string;
  progress: number;
  completed: boolean;
  error: string | null;
  details?: {
    sectorsProcessed: number;
    categoriesProcessed: number;
    subcategoriesProcessed: number;
    jobsProcessed: number;
    totalSectors: number;
    totalCategories: number;
    totalSubcategories: number;
    totalJobs: number;
  };
}

export interface ImportStats {
  totalSectors: number;
  totalCategories: number;
  totalSubcategories: number;
  totalServices: number;
  filesProcessed: number;
}

export interface ImportResult {
  success: boolean;
  message: string;
  stats?: ImportStats;
}

export interface ProcessedServiceData {
  sectors: ServiceSector[];
  stats: ImportStats;
  sectorName?: string;
  categories?: any[];
}

export interface StorageFile {
  name: string;
  id?: string;
  path?: string;
  size?: number;
  type?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  lastModified?: Date;
  metadata?: any;
}

export interface SectorFiles {
  sectorName: string;
  excelFiles: StorageFile[];
  totalFiles: number;
}

export interface ImportOptions {
  mode: 'skip' | 'update';
  clearExisting?: boolean;
}

// Excel-specific types for the new structure
export interface ExcelServiceData {
  name: string;
  description: string;
  estimatedTime: number;
  price: number;
}

export interface ExcelSubcategoryData {
  name: string;
  services: ExcelServiceData[];
}

export interface ExcelCategoryData {
  name: string; // File name becomes category name
  subcategories: ExcelSubcategoryData[];
}

export interface ExcelSectorData {
  sectorName: string; // Folder name becomes sector name
  categories: ExcelCategoryData[];
}
