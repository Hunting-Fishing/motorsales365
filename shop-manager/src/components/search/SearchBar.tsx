
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SearchResults } from '@/components/search/SearchResults';
import { performSearch, SearchResult } from '@/utils/search';
import { enhancedSearch } from '@/utils/search/enhancedSearch';

export function SearchBar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Handle search form submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      try {
        const results = await performSearch(searchQuery);
        setSearchResults(results);
        setShowResults(true);
        
        // Save to search history
        const history = JSON.parse(localStorage.getItem('globalSearchHistory') || '[]');
        const newHistory = [searchQuery, ...history.filter((item: string) => item !== searchQuery)].slice(0, 10);
        localStorage.setItem('globalSearchHistory', JSON.stringify(newHistory));
        
        // Track search analytics
        if (results.length === 0) {
          console.log('Search with no results:', searchQuery);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }
  };

  // Update search results as user types with enhanced search
  useEffect(() => {
    if (searchQuery.trim() && searchQuery.length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const results = await performSearch(searchQuery);
          setSearchResults(results);
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      }, 300); // Debounce
      
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + / to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // ESC to close search results
      if (e.key === 'Escape' && showResults) {
        setShowResults(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showResults]);

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  // Navigate to search result
  const handleResultClick = (url: string) => {
    clearSearch();
    navigate(url);
  };

  return (
    <div className="relative max-w-md w-full" ref={searchRef}>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Enhanced search: try 'belt', 'brake pad', 'oil change'..."
          className="pl-10 w-full pr-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {searchQuery && (
          <button 
            type="button" 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>
      
      <div className="absolute right-3 -top-7 text-xs text-slate-500">
        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 mr-1">⌘</kbd>
        <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">/</kbd>
      </div>
      
      {isSearching && (
        <div className="absolute mt-1 w-full z-50 bg-white shadow-lg rounded-md p-4 flex justify-center items-center">
          <div className="animate-pulse flex space-x-2 items-center">
            <div className="h-2 w-2 bg-slate-200 rounded-full"></div>
            <div className="h-2 w-2 bg-slate-300 rounded-full"></div>
            <div className="h-2 w-2 bg-slate-400 rounded-full"></div>
            <span className="text-sm text-slate-500">Enhanced searching...</span>
          </div>
        </div>
      )}
      
      {showResults && searchResults.length > 0 && (
        <div className="absolute mt-1 w-full z-50">
          <SearchResults results={searchResults} onItemClick={handleResultClick} />
        </div>
      )}
      
      {showResults && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
        <div className="absolute mt-1 w-full z-50 bg-white shadow-lg rounded-md p-4 text-center">
          <p className="text-slate-500">No results found for "{searchQuery}"</p>
          <p className="text-xs text-slate-400 mt-1">Try using automotive terms like "belt", "brake", "oil change"</p>
          <div className="mt-2 text-xs text-slate-400">
            <p>💡 Enhanced search looks for words anywhere in service names</p>
          </div>
        </div>
      )}
    </div>
  );
}
