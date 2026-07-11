
// If this file exists, we need to make sure it contains the necessary types
// If it doesn't exist, we'll create it

/**
 * Types of searchable entities in the application
 */
export type SearchResultType = 
  | "work-order" 
  | "invoice" 
  | "customer" 
  | "equipment" 
  | "inventory"
  | "service-category"
  | "service-subcategory"
  | "service-job";

/**
 * Search result interface for unified search results
 */
export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: SearchResultType;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for recent searches
 */
export interface RecentSearch {
  query: string;
  timestamp: number;
}
