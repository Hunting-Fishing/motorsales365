import React, { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useOptimizedInventoryFilters } from '@/hooks/inventory/useOptimizedInventoryFilters';
import { Search, X, Filter, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  type: 'name' | 'sku' | 'category' | 'supplier' | 'description';
  value: string;
  count?: number;
}

interface AdvancedSearchInputProps {
  placeholder?: string;
  className?: string;
}

export function AdvancedSearchInput({ 
  placeholder = "Search inventory...", 
  className 
}: AdvancedSearchInputProps) {
  const { 
    filters, 
    filteredItems,
    filterOptions,
    updateSearch,
    resetFilters 
  } = useOptimizedInventoryFilters();
  
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(filters.search);
  
  // Generate smart suggestions based on current data
  const suggestions = useMemo(() => {
    if (!inputValue || inputValue.length < 2) return [];
    
    const searchTerm = inputValue.toLowerCase();
    const suggestionMap = new Map<string, SearchSuggestion>();
    
    filteredItems.forEach(item => {
      // Name suggestions
      if (item.name.toLowerCase().includes(searchTerm)) {
        const key = `name:${item.name}`;
        if (!suggestionMap.has(key)) {
          suggestionMap.set(key, {
            type: 'name',
            value: item.name,
            count: 1
          });
        } else {
          suggestionMap.get(key)!.count!++;
        }
      }
      
      // SKU suggestions
      if (item.sku.toLowerCase().includes(searchTerm)) {
        const key = `sku:${item.sku}`;
        suggestionMap.set(key, {
          type: 'sku',
          value: item.sku
        });
      }
      
      // Category suggestions
      if (item.category && item.category.toLowerCase().includes(searchTerm)) {
        const key = `category:${item.category}`;
        if (!suggestionMap.has(key)) {
          suggestionMap.set(key, {
            type: 'category',
            value: item.category,
            count: 1
          });
        } else {
          suggestionMap.get(key)!.count!++;
        }
      }
      
      // Supplier suggestions
      if (item.supplier && item.supplier.toLowerCase().includes(searchTerm)) {
        const key = `supplier:${item.supplier}`;
        if (!suggestionMap.has(key)) {
          suggestionMap.set(key, {
            type: 'supplier',
            value: item.supplier,
            count: 1
          });
        } else {
          suggestionMap.get(key)!.count!++;
        }
      }
    });
    
    return Array.from(suggestionMap.values())
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 8);
  }, [inputValue, filteredItems]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    updateSearch(value);
    setIsOpen(value.length >= 2);
  }, [updateSearch]);

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    const newValue = suggestion.value;
    setInputValue(newValue);
    updateSearch(newValue);
    setIsOpen(false);
  }, [updateSearch]);

  const handleClearSearch = useCallback(() => {
    setInputValue('');
    updateSearch('');
    setIsOpen(false);
  }, [updateSearch]);

  const hasActiveFilters = filters.search || 
    filters.category.length > 0 || 
    filters.status.length > 0 || 
    filters.supplier || 
    filters.location;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'name': return '📦';
      case 'sku': return '🏷️';
      case 'category': return '📁';
      case 'supplier': return '🏢';
      case 'description': return '📝';
      default: return '🔍';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={placeholder}
              className={cn(
                "pl-10 pr-20 transition-all duration-200",
                hasActiveFilters && "border-primary ring-1 ring-primary/20"
              )}
              onFocus={() => setIsOpen(inputValue.length >= 2)}
            />
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {hasActiveFilters && (
                <>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    <Filter className="h-3 w-3 mr-1" />
                    {filteredItems.length}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="h-6 w-6 p-0 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
              
              {suggestions.length > 0 && (
                <Sparkles className="h-4 w-4 text-muted-foreground animate-pulse" />
              )}
            </div>
          </div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command>
            <CommandList>
              {suggestions.length === 0 ? (
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  No suggestions found
                </CommandEmpty>
              ) : (
                <CommandGroup heading="Smart Suggestions">
                  {suggestions.map((suggestion, index) => (
                    <CommandItem
                      key={`${suggestion.type}-${suggestion.value}-${index}`}
                      value={suggestion.value}
                      onSelect={() => handleSuggestionSelect(suggestion)}
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                        <div className="flex flex-col">
                          <span className="font-medium">{suggestion.value}</span>
                          <span className="text-xs text-muted-foreground">
                            {getTypeLabel(suggestion.type)}
                            {suggestion.count && suggestion.count > 1 && ` (${suggestion.count} items)`}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {hasActiveFilters && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="h-6 text-xs px-2"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}