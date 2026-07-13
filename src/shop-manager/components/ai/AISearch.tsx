import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Clock, FileText, User, Package, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'order' | 'service' | 'document';
  title: string;
  description: string;
  relevance_score: number;
  metadata: any;
}

interface SearchFilters {
  type: string;
  dateRange: string;
}

export const AISearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    dateRange: 'all'
  });

  const searchTypes = [
    { value: 'all', label: 'All', icon: Search },
    { value: 'customer', label: 'Customers', icon: User },
    { value: 'product', label: 'Products', icon: Package },
    { value: 'service', label: 'Services', icon: FileText },
    { value: 'document', label: 'Documents', icon: FileText },
    { value: 'order', label: 'Orders', icon: Calendar }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('ai-search-recent');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('ai-search-recent', JSON.stringify(updated));
  };

  const performSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    saveRecentSearch(searchQuery);

    try {
      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: {
          query: searchQuery,
          filters: filters,
          limit: 20
        }
      });

      if (error) throw error;
      
      setResults(data.results || []);
    } catch (error) {
      console.error('Error performing search:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform AI search",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = searchTypes.find(t => t.value === type);
    const Icon = typeConfig?.icon || FileText;
    return <Icon className="w-4 h-4" />;
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          AI-Powered Search
        </CardTitle>
        <CardDescription>
          Natural language search across all your business data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about your business..."
              className="pl-10"
            />
          </div>
          <Button 
            onClick={() => performSearch()}
            disabled={!query.trim() || isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {searchTypes.map((type) => (
            <Button
              key={type.value}
              variant={filters.type === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(prev => ({ ...prev, type: type.value }))}
              className="flex items-center gap-1"
            >
              {getTypeIcon(type.value)}
              {type.label}
            </Button>
          ))}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && !query && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Searches
            </h4>
            <div className="flex gap-2 flex-wrap">
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery(search);
                    performSearch(search);
                  }}
                >
                  {search}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">
              Found {results.length} results
            </h4>
            {results.map((result) => (
              <div key={result.id} className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(result.type)}
                    <Badge variant="outline" className="capitalize">
                      {result.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${getRelevanceColor(result.relevance_score)}`}
                      title={`Relevance: ${Math.round(result.relevance_score * 100)}%`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(result.relevance_score * 100)}%
                    </span>
                  </div>
                </div>
                <h5 className="font-medium mb-1">{result.title}</h5>
                <p className="text-sm text-muted-foreground">{result.description}</p>
                {result.metadata && Object.keys(result.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {result.metadata.category && (
                      <span>Category: {result.metadata.category} • </span>
                    )}
                    {result.metadata.date && (
                      <span>Date: {new Date(result.metadata.date).toLocaleDateString()}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && query && results.length === 0 && (
          <div className="text-center py-8">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No results found for "{query}"</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};