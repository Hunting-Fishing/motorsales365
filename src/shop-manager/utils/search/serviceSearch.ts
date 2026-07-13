import { ServiceMainCategory } from '@/types/service';
import { searchServiceCategories } from "./searchService";
import { SearchResult } from "./types";

/**
 * Perform a search across service categories and convert results to SearchResult format
 * @param query The search query
 * @param categories Optional array of categories to search within
 * @returns Array of search results
 */
export const performServiceSearch = async (
  query: string,
  categories?: ServiceMainCategory[]
): Promise<SearchResult[]> => {
  if (!query.trim()) {
    return [];
  }

  // If no categories provided, we'll return an empty array
  // In a real app, this would fetch categories from an API
  if (!categories || categories.length === 0) {
    return [];
  }

  // Search through the categories
  const matchingCategories = searchServiceCategories(categories, query);
  
  // Convert to SearchResult format
  const results: SearchResult[] = [];
  
  matchingCategories.forEach(category => {
    // Add the category as a result
    results.push({
      id: category.id,
      title: category.name,
      subtitle: category.description || "Service Category",
      type: "service-category",
      url: `/developer/service-management?categoryId=${category.id}`,
    });
    
    // Add matching subcategories
    category.subcategories.forEach(subcategory => {
      if (
        subcategory.name.toLowerCase().includes(query.toLowerCase()) ||
        (subcategory.description && 
         subcategory.description.toLowerCase().includes(query.toLowerCase()))
      ) {
        results.push({
          id: subcategory.id,
          title: subcategory.name,
          subtitle: `Category: ${category.name}`,
          type: "service-subcategory",
          url: `/developer/service-management?categoryId=${category.id}&subcategoryId=${subcategory.id}`,
        });
      }
      
      // Add matching jobs
      subcategory.jobs.forEach(job => {
        if (
          job.name.toLowerCase().includes(query.toLowerCase()) ||
          (job.description && 
           job.description.toLowerCase().includes(query.toLowerCase()))
        ) {
          results.push({
            id: job.id,
            title: job.name,
            subtitle: `${category.name} > ${subcategory.name}`,
            type: "service-job",
            url: `/developer/service-management?categoryId=${category.id}&subcategoryId=${subcategory.id}&jobId=${job.id}`,
            metadata: {
              price: job.price,
              estimatedTime: job.estimatedTime
            }
          });
        }
      });
    });
  });
  
  return results;
};
