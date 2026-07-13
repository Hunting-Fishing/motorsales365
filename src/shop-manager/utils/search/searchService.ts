import { ServiceMainCategory, ServiceSubcategory, ServiceJob } from '@/types/service';

// Helper function to search through service categories
export const searchServiceCategories = (
  categories: ServiceMainCategory[],
  searchTerm: string
): ServiceMainCategory[] => {
  if (!searchTerm) return categories;
  
  const lowercaseTerm = searchTerm.toLowerCase();
  
  return categories.filter((category) => {
    // Check if the category matches
    if (
      category.name.toLowerCase().includes(lowercaseTerm) ||
      (category.description && category.description.toLowerCase().includes(lowercaseTerm))
    ) {
      return true;
    }
    
    // Check if any subcategories match
    const matchingSubcategories = category.subcategories.filter((sub) => {
      if (
        sub.name.toLowerCase().includes(lowercaseTerm) ||
        (sub.description && sub.description.toLowerCase().includes(lowercaseTerm))
      ) {
        return true;
      }
      
      // Check if any jobs match
      return sub.jobs.some(
        (job) =>
          job.name.toLowerCase().includes(lowercaseTerm) ||
          (job.description && job.description.toLowerCase().includes(lowercaseTerm))
      );
    });
    
    return matchingSubcategories.length > 0;
  });
};

// Helper function to get matching subcategories for a category
export const getMatchingSubcategories = (
  category: ServiceMainCategory,
  searchTerm: string
): ServiceSubcategory[] => {
  if (!searchTerm) return category.subcategories;
  
  const lowercaseTerm = searchTerm.toLowerCase();
  
  return category.subcategories.filter((sub) => {
    if (
      sub.name.toLowerCase().includes(lowercaseTerm) ||
      (sub.description && sub.description.toLowerCase().includes(lowercaseTerm))
    ) {
      return true;
    }
    
    return sub.jobs.some(
      (job) =>
        job.name.toLowerCase().includes(lowercaseTerm) ||
        (job.description && job.description.toLowerCase().includes(lowercaseTerm))
    );
  });
};

// Helper function to get matching jobs for a subcategory
export const getMatchingJobs = (
  subcategory: ServiceSubcategory,
  searchTerm: string
): ServiceJob[] => {
  if (!searchTerm) return subcategory.jobs;
  
  const lowercaseTerm = searchTerm.toLowerCase();
  
  return subcategory.jobs.filter(
    (job) =>
      job.name.toLowerCase().includes(lowercaseTerm) ||
      (job.description && job.description.toLowerCase().includes(lowercaseTerm))
  );
};
