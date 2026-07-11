
export type ManufacturerCategory = 
  | 'automotive'
  | 'heavy-duty'
  | 'equipment'
  | 'marine'
  | 'atv-utv'
  | 'motorcycle';

export type ManufacturerRegion = 'asia-ph' | 'asia' | 'europe' | 'north-america';

export interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: ManufacturerCategory;
  logoUrl?: string;
  websiteUrl?: string;
  featured?: boolean;
  productCount?: number;
  /** Regions where this manufacturer's vehicles are commonly sold/serviced. */
  regions?: ManufacturerRegion[];
}

export interface ToolCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  subcategories?: string[];
  imageUrl?: string;
  featured?: boolean;
  productCount?: number;
}

export interface AffiliateTool {
  id: string;
  name: string;
  description: string;
  slug: string;
  price?: number;
  salePrice?: number;
  imageUrl?: string;
  category: string;
  subcategory?: string;
  manufacturer: string;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  bestSeller?: boolean;
  affiliateLink: string;
  seller?: string;
  tags?: string[]; // Added tags property
}

export interface ToolSubmission {
  id: string;
  toolName: string;
  manufacturerName: string;
  category: string;
  subcategory?: string;
  description?: string;
  imageUrl?: string;
  suggestedPrice?: number;
  submitterEmail: string;
  submitterName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'modifications';
  submissionDate: string;
  notes?: string;
}

export interface FeaturedGroup {
  id: string;
  name: string;
  description: string;
  slug: string;
  toolIds: string[];
  priority: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

// Add missing types to fix build errors

// ProductTier type for ProductTierBadge
export type ProductTier = 'premium' | 'midgrade' | 'economy';

// AffiliateProduct for components that need it
export interface AffiliateProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  retailPrice: number;
  affiliateUrl: string;
  category: string;
  tier: ProductTier;
  rating?: number;
  reviewCount?: number;
  manufacturer: string;
  model?: string;
  discount?: number;
  isFeatured?: boolean;
  bestSeller?: boolean;
  freeShipping?: boolean;
  source?: 'amazon' | 'other';
}

// UserSubmission for SubmissionsManagement
export interface UserSubmission {
  id: string;
  productName: string;
  submittedBy?: string;
  suggestedCategory: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'modifications';
  notes?: string;
  productUrl?: string;
}
