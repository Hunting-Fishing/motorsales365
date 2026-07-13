
import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceMainCategory, ServiceJob } from '@/types/service';
import { Card } from '@/components/ui/card';

interface EnhancedServiceSearchProps {
  value: string;
  onChange: (value: string) => void;
  categories: ServiceMainCategory[];
  onServiceSelect: (service: ServiceJob, categoryName: string, subcategoryName: string) => void;
  placeholder?: string;
}

export const EnhancedServiceSearch: React.FC<EnhancedServiceSearchProps> = ({
  value,
  onChange,
  categories,
  onServiceSelect,
  placeholder = "Search services..."
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{
    service: ServiceJob;
    categoryName: string;
    subcategoryName: string;
    matchType: 'name' | 'description';
  }>>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate suggestions based on search term
  useEffect(() => {
    if (!value.trim() || value.length < 2) {
      setSuggestions([]);
      return;
    }

    const query = value.toLowerCase();
    const newSuggestions: typeof suggestions = [];

    categories.forEach(category => {
      category.subcategories.forEach(subcategory => {
        subcategory.jobs.forEach(service => {
          const nameMatch = service.name.toLowerCase().includes(query);
          const descMatch = service.description?.toLowerCase().includes(query);
          
          if (nameMatch || descMatch) {
            newSuggestions.push({
              service,
              categoryName: category.name,
              subcategoryName: subcategory.name,
              matchType: nameMatch ? 'name' : 'description'
            });
          }
        });
      });
    });

    // Limit to top 8 results for performance
    setSuggestions(newSuggestions.slice(0, 8));
  }, [value, categories]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: typeof suggestions[0]) => {
    onServiceSelect(suggestion.service, suggestion.categoryName, suggestion.subcategoryName);
    onChange('');
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <span key={index} className="bg-yellow-200 font-medium">{part}</span> : 
        part
    );
  };

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setShowSuggestions(true)}
          className="pl-9 pr-9 bg-background border-input focus:border-primary focus:ring-primary relative z-20"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted z-10"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && value.length >= 2 && (
        <Card className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto shadow-lg border bg-popover z-50">
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2 px-2">
              Found {suggestions.length} service{suggestions.length !== 1 ? 's' : ''}:
            </div>
            <div className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.service.id}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors group"
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-sm text-foreground">
                      {highlightMatch(suggestion.service.name, value)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {suggestion.categoryName} › {suggestion.subcategoryName}
                    </div>
                    {suggestion.service.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {highlightMatch(suggestion.service.description, value)}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-1">
                      {suggestion.service.estimatedTime && (
                        <span className="text-xs text-muted-foreground">
                          {suggestion.service.estimatedTime} min
                        </span>
                      )}
                      {suggestion.service.price && (
                        <span className="text-xs font-medium text-primary">
                          ${suggestion.service.price}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
