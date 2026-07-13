import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SimpleSearchResult {
  id: string;
  title: string;
  type: string;
  content: string;
  category?: string;
}

interface HelpSearchProps {
  className?: string;
}

export const HelpSearch: React.FC<HelpSearchProps> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SimpleSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('id, title, summary, category, content')
        .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%`)
        .eq('status', 'published')
        .limit(10);

      if (error) {
        console.error('Error searching help articles:', error);
        setResults([]);
        return;
      }

      const searchResults: SimpleSearchResult[] = (data || []).map(article => ({
        id: article.id,
        title: article.title,
        type: 'article',
        content: article.summary || article.content?.slice(0, 100) + '...' || '',
        category: article.category,
      }));

      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        handleSearch(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleResultClick = (result: SimpleSearchResult) => {
    if (result.type === 'article') {
      navigate(`/help/article/${result.id}`);
    }
    setShowResults(false);
    setQuery('');
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search help articles and resources..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setShowResults(true)}
            className="pl-10 pr-10"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-4">
            {isSearching ? (
              <div className="text-center py-4 text-muted-foreground">
                Searching...
              </div>
            ) : query && results.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : query && results.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground mb-3">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </div>
                {results.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="p-3 rounded-lg hover:bg-muted cursor-pointer border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{result.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.content}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {result.type}
                        </Badge>
                        {result.category && (
                          <Badge variant="outline" className="text-xs">
                            {result.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Start typing to search help content...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
