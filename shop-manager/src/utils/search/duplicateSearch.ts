import { ServiceMainCategory, ServiceSubcategory, ServiceJob } from '@/types/service';

export interface DuplicateOccurrence {
  itemId: string;
  name: string;
  type: 'category' | 'subcategory' | 'job';
  path: string;
}

export interface DuplicateItem {
  matchType: 'exact' | 'exact_words' | 'similar' | 'partial';
  similarity: number;
  occurrences: DuplicateOccurrence[];
}

export interface DuplicateSearchOptions {
  matchTypes: string[];
  searchScope: 'all' | 'categories' | 'subcategories' | 'jobs';
  similarityThreshold: number;
  ignoreCase: boolean;
  ignorePunctuation: boolean;
  minWordLength: number;
}

export const defaultSearchOptions: DuplicateSearchOptions = {
  matchTypes: ['exact', 'exact_words', 'similar'],
  searchScope: 'all',
  similarityThreshold: 80,
  ignoreCase: true,
  ignorePunctuation: true,
  minWordLength: 3
};

// Helper function to normalize text for comparison
const normalizeText = (text: string, options: DuplicateSearchOptions): string => {
  let normalized = text;
  
  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }
  
  if (options.ignorePunctuation) {
    normalized = normalized.replace(/[^\w\s]/g, '');
  }
  
  return normalized.trim();
};

// Helper function to calculate similarity percentage between two strings
const calculateSimilarity = (str1: string, str2: string): number => {
  if (str1 === str2) return 100;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 100;
  
  const distance = levenshteinDistance(longer, shorter);
  return Math.round(((longer.length - distance) / longer.length) * 100);
};

// Levenshtein distance calculation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Helper function to check if two strings match based on criteria
const getMatchType = (text1: string, text2: string, options: DuplicateSearchOptions): string | null => {
  const norm1 = normalizeText(text1, options);
  const norm2 = normalizeText(text2, options);
  
  // Exact match
  if (norm1 === norm2) {
    return 'exact';
  }
  
  // Exact words match (same words, different order)
  const words1 = norm1.split(/\s+/).filter(w => w.length >= options.minWordLength).sort();
  const words2 = norm2.split(/\s+/).filter(w => w.length >= options.minWordLength).sort();
  
  if (words1.length === words2.length && words1.every((word, index) => word === words2[index])) {
    return 'exact_words';
  }
  
  // Similar match (based on similarity threshold)
  const similarityScore = calculateSimilarity(norm1, norm2);
  if (similarityScore >= options.similarityThreshold) {
    return 'similar';
  }
  
  // Partial match (contains common significant words)
  const commonWords = words1.filter(word => words2.includes(word));
  if (commonWords.length > 0 && commonWords.length >= Math.min(words1.length, words2.length) * 0.5) {
    return 'partial';
  }
  
  return null;
};

// Helper function to build item path
const buildPath = (item: any, type: 'category' | 'subcategory' | 'job', categories: ServiceMainCategory[]): string => {
  if (type === 'category') {
    return item.name;
  }
  
  if (type === 'subcategory') {
    const category = categories.find(cat => 
      cat.subcategories?.some(sub => sub.id === item.id)
    );
    return category ? `${category.name} > ${item.name}` : item.name;
  }
  
  if (type === 'job') {
    for (const category of categories) {
      for (const subcategory of category.subcategories || []) {
        if (subcategory.jobs?.some(job => job.id === item.id)) {
          return `${category.name} > ${subcategory.name} > ${item.name}`;
        }
      }
    }
    return item.name;
  }
  
  return item.name;
};

// Main function to find duplicates
export const findServiceDuplicates = (
  categories: ServiceMainCategory[], 
  options: DuplicateSearchOptions = defaultSearchOptions
): DuplicateItem[] => {
  const allItems: Array<{
    id: string;
    name: string;
    type: 'category' | 'subcategory' | 'job';
    item: any;
  }> = [];
  
  // Collect all items based on search scope
  for (const category of categories) {
    if (options.searchScope === 'all' || options.searchScope === 'categories') {
      allItems.push({
        id: category.id,
        name: category.name,
        type: 'category',
        item: category
      });
    }
    
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        if (options.searchScope === 'all' || options.searchScope === 'subcategories') {
          allItems.push({
            id: subcategory.id,
            name: subcategory.name,
            type: 'subcategory',
            item: subcategory
          });
        }
        
        if (subcategory.jobs) {
          for (const job of subcategory.jobs) {
            if (options.searchScope === 'all' || options.searchScope === 'jobs') {
              allItems.push({
                id: job.id,
                name: job.name,
                type: 'job',
                item: job
              });
            }
          }
        }
      }
    }
  }
  
  const duplicateGroups: Map<string, DuplicateItem> = new Map();
  const processed = new Set<string>();
  
  // Compare all items
  for (let i = 0; i < allItems.length; i++) {
    const item1 = allItems[i];
    
    if (processed.has(item1.id)) continue;
    
    const duplicates: DuplicateOccurrence[] = [];
    let bestMatchType = '';
    let bestSimilarity = 0;
    
    // Add the original item
    duplicates.push({
      itemId: item1.id,
      name: item1.name,
      type: item1.type,
      path: buildPath(item1.item, item1.type, categories)
    });
    
    for (let j = i + 1; j < allItems.length; j++) {
      const item2 = allItems[j];
      
      if (processed.has(item2.id)) continue;
      
      const matchType = getMatchType(item1.name, item2.name, options);
      
      if (matchType && options.matchTypes.includes(matchType)) {
        const similarityScore = calculateSimilarity(
          normalizeText(item1.name, options),
          normalizeText(item2.name, options)
        );
        
        duplicates.push({
          itemId: item2.id,
          name: item2.name,
          type: item2.type,
          path: buildPath(item2.item, item2.type, categories)
        });
        
        processed.add(item2.id);
        
        // Update best match info
        if (similarityScore > bestSimilarity) {
          bestSimilarity = similarityScore;
          bestMatchType = matchType;
        }
      }
    }
    
    // Only add if we found actual duplicates (more than 1 occurrence)
    if (duplicates.length > 1) {
      const groupKey = `${bestMatchType}_${bestSimilarity}_${duplicates[0].itemId}`;
      duplicateGroups.set(groupKey, {
        matchType: bestMatchType as 'exact' | 'exact_words' | 'similar' | 'partial',
        similarity: bestSimilarity,
        occurrences: duplicates
      });
      
      processed.add(item1.id);
    }
  }
  
  return Array.from(duplicateGroups.values()).sort((a, b) => {
    // Sort by match type priority, then by similarity
    const priority = { exact: 4, exact_words: 3, similar: 2, partial: 1 };
    const aPriority = priority[a.matchType] || 0;
    const bPriority = priority[b.matchType] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return b.similarity - a.similarity;
  });
};

// Function to generate recommendations based on found duplicates
export const generateDuplicateRecommendations = (duplicates: DuplicateItem[]): string[] => {
  const recommendations: string[] = [];
  
  if (duplicates.length === 0) {
    recommendations.push("No duplicates found. Your service hierarchy appears to be well-organized.");
    return recommendations;
  }
  
  const exactMatches = duplicates.filter(d => d.matchType === 'exact').length;
  const exactWordMatches = duplicates.filter(d => d.matchType === 'exact_words').length;
  const similarMatches = duplicates.filter(d => d.matchType === 'similar').length;
  
  if (exactMatches > 0) {
    recommendations.push(`Found ${exactMatches} exact duplicate(s). Consider removing or merging these items immediately.`);
  }
  
  if (exactWordMatches > 0) {
    recommendations.push(`Found ${exactWordMatches} items with identical words in different order. Review for potential consolidation.`);
  }
  
  if (similarMatches > 0) {
    recommendations.push(`Found ${similarMatches} similar item(s). Consider standardizing naming conventions.`);
  }
  
  if (duplicates.length > 10) {
    recommendations.push("Large number of duplicates detected. Consider implementing a naming convention guide.");
  }
  
  return recommendations;
};
