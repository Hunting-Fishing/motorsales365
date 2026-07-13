
// Constants for recent searches
const MAX_RECENT_SEARCHES = 10;
const STORAGE_KEY = 'esm-recent-searches';

// Save recent search to localStorage
export const saveRecentSearch = (query: string): void => {
  try {
    const recentSearches = getRecentSearches();
    // Remove if already exists (to move to top)
    const updatedSearches = recentSearches.filter(s => s !== query);
    // Add to beginning
    updatedSearches.unshift(query);
    // Limit to max size
    const trimmedSearches = updatedSearches.slice(0, MAX_RECENT_SEARCHES);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedSearches));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
};

// Get recent searches from localStorage
export const getRecentSearches = (): string[] => {
  try {
    const searches = localStorage.getItem(STORAGE_KEY);
    return searches ? JSON.parse(searches) : [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

// Clear all recent searches
export const clearRecentSearches = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
};
