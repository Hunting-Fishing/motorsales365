import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Clock, TrendingUp, X } from 'lucide-react';

interface SearchSuggestionsProps {
  query: string;
  onSuggestionClick: (suggestion: string) => void;
  onClearHistory?: () => void;
  show: boolean;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
  query,
  onSuggestionClick,
  onClearHistory,
  show
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState([
    'socket set',
    'impact wrench',
    'diagnostic tool',
    'torque wrench',
    'brake tools',
    'engine tools',
    'transmission tools',
    'electrical tools'
  ]);

  useEffect(() => {
    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
    onClearHistory?.();
  };

  const removeRecentSearch = (searchToRemove: string) => {
    const updated = recentSearches.filter(s => s !== searchToRemove);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const getFilteredSuggestions = () => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    return popularSearches
      .filter(search => search.toLowerCase().includes(lowerQuery))
      .slice(0, 5);
  };

  const handleSuggestionClick = (suggestion: string) => {
    saveSearch(suggestion);
    onSuggestionClick(suggestion);
  };

  if (!show) return null;

  const filteredSuggestions = getFilteredSuggestions();

  return (
    <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg">
      <CardContent className="p-0">
        {/* Query-based suggestions */}
        {filteredSuggestions.length > 0 && (
          <div className="border-b">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">
                  {suggestion.split(new RegExp(`(${query})`, 'gi')).map((part, i) => 
                    part.toLowerCase() === query.toLowerCase() ? (
                      <span key={i} className="font-medium text-primary">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && !query.trim() && (
          <div className="border-b">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
              <span className="text-sm font-medium text-muted-foreground">Recent Searches</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecentSearches}
                className="h-auto p-1 text-xs"
              >
                Clear
              </Button>
            </div>
            {recentSearches.map((search, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted group"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <button
                  className="flex-1 text-left"
                  onClick={() => handleSuggestionClick(search)}
                >
                  {search}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRecentSearch(search)}
                  className="opacity-0 group-hover:opacity-100 h-auto p-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Popular searches */}
        {!query.trim() && (
          <div>
            <div className="px-4 py-2 border-b bg-muted/50">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Popular Searches
              </span>
            </div>
            {popularSearches.slice(0, 6).map((search, index) => (
              <button
                key={index}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted text-left transition-colors"
                onClick={() => handleSuggestionClick(search)}
              >
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{search}</span>
              </button>
            ))}
          </div>
        )}

        {/* No suggestions */}
        {query.trim() && filteredSuggestions.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No suggestions found for "{query}"</p>
            <p className="text-sm">Try searching for automotive tools or equipment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchSuggestions;