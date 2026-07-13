
import React, { useState, useEffect } from 'react';
import { Search, Clock, BookOpen, MessageSquare, Video, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'faq' | 'tutorial' | 'guide' | 'video' | 'support';
  tags: string[];
  url: string;
  relevance: number;
}

interface HelpSearchEngineProps {
  onResultClick?: (result: SearchResult) => void;
}


const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'faq':
      return <MessageSquare className="h-4 w-4" />;
    case 'tutorial':
      return <BookOpen className="h-4 w-4" />;
    case 'guide':
      return <FileText className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'support':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'faq':
      return 'info';
    case 'tutorial':
      return 'success';
    case 'guide':
      return 'secondary';
    case 'video':
      return 'warning';
    case 'support':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export const HelpSearchEngine: React.FC<HelpSearchEngineProps> = ({ onResultClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('help_articles')
            .select('*')
            .eq('status', 'published')
            .or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,search_keywords.cs.{${searchQuery}}`)
            .limit(10);

          if (error) throw error;

          const results = data.map(article => ({
            id: article.id,
            title: article.title,
            description: article.content.substring(0, 150) + '...',
            category: article.category as any,
            tags: article.tags || [],
            url: `/help?id=${article.id}`,
            relevance: 95 // You could implement actual relevance scoring
          }));

          setSearchResults(results);
          
          // Record search analytics
          await supabase
            .from('help_search_analytics')
            .insert({
              search_query: searchQuery,
              results_count: results.length,
              search_time_ms: 300,
              user_id: (await supabase.auth.getUser()).data.user?.id
            });
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help articles, tutorials, and guides..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {recentSearches.length > 0 && !searchQuery && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery(search)}
                  className="h-auto py-1 px-2 text-xs"
                >
                  {search}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isSearching && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              Searching...
            </div>
          </CardContent>
        </Card>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((result) => (
            <Card 
              key={result.id} 
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => handleResultClick(result)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getCategoryIcon(result.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{result.title}</h3>
                      <Badge variant={getCategoryColor(result.category) as any} className="text-xs">
                        {result.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {result.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {result.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchQuery && !isSearching && searchResults.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">No results found for "{searchQuery}"</p>
              <p className="text-sm">Try using different keywords or check our FAQ section.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
