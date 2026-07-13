
// Re-export everything from individual files
export * from './types';
export * from './recentSearches';
export * from './relevanceUtils';
export * from './searchProviders';
export * from './searchService';
export * from './customerSearch';
export * from './serviceSearch';
export * from './duplicateSearch';

// Generic search function that combines results from different search providers
import { SearchResult } from "./types";

/**
 * Perform a search across all searchable entities
 * @param query The search query
 * @returns Array of search results
 */
export const performSearch = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim()) {
    return [];
  }
  
  try {
    // Here we would call multiple search providers and combine their results
    // For now, returning empty array since we need to implement proper search providers
    return [];
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
};
