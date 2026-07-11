import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X, ExternalLink, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';

interface ContextualSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'tip' | 'tutorial' | 'warning' | 'info';
  priority: number;
  articleId?: string;
  action?: {
    label: string;
    url: string;
  };
}

interface SmartHelpWidgetProps {
  page?: string;
  context?: Record<string, any>;
  isVisible?: boolean;
  onClose?: () => void;
}

// Route-based help suggestions
const ROUTE_SUGGESTIONS: Record<string, ContextualSuggestion[]> = {
  '/work-orders': [
    {
      id: 'wo-getting-started',
      title: 'Getting Started with Work Orders',
      description: 'Learn how to create and manage work orders efficiently',
      type: 'tutorial',
      priority: 10,
      action: { label: 'View Tutorial', url: '/help?id=wo-tutorial' }
    },
    {
      id: 'wo-status-management',
      title: 'Work Order Status Best Practices',
      description: 'Understand how to properly manage work order statuses for better workflow',
      type: 'tip',
      priority: 8,
      action: { label: 'Learn More', url: '/help?id=wo-status' }
    }
  ],
  '/customers': [
    {
      id: 'customer-management',
      title: 'Customer Management Guide',
      description: 'Tips for organizing and maintaining customer information',
      type: 'tutorial',
      priority: 9,
      action: { label: 'Read Guide', url: '/help?id=customer-guide' }
    },
    {
      id: 'customer-communication',
      title: 'Effective Customer Communication',
      description: 'Best practices for customer communication and follow-up',
      type: 'tip',
      priority: 7,
      action: { label: 'View Tips', url: '/help?id=communication-tips' }
    }
  ],
  '/inventory': [
    {
      id: 'inventory-setup',
      title: 'Inventory Management Setup',
      description: 'Configure your inventory system for optimal tracking',
      type: 'tutorial',
      priority: 10,
      action: { label: 'Setup Guide', url: '/help?id=inventory-setup' }
    },
    {
      id: 'low-stock-alerts',
      title: 'Setting Up Low Stock Alerts',
      description: 'Never run out of critical parts again with smart alerts',
      type: 'tip',
      priority: 8,
      action: { label: 'Configure Alerts', url: '/help?id=stock-alerts' }
    }
  ],
  '/help': [
    {
      id: 'help-navigation',
      title: 'Navigating the Help Center',
      description: 'Find answers faster with these search and navigation tips',
      type: 'tip',
      priority: 5,
      action: { label: 'Search Tips', url: '/help?id=search-tips' }
    }
  ]
};

export function SmartHelpWidget({ page, context, isVisible = true, onClose }: SmartHelpWidgetProps) {
  const location = useLocation();
  const [suggestions, setSuggestions] = useState<ContextualSuggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  const currentPage = page || location.pathname;

  useEffect(() => {
    loadContextualSuggestions();
  }, [currentPage, context]);

  const loadContextualSuggestions = async () => {
    setIsLoading(true);
    try {
      // Get static route-based suggestions
      const routeSuggestions = ROUTE_SUGGESTIONS[currentPage] || [];
      
      // Load dynamic suggestions from database based on user behavior
      const { data: searchData } = await supabase
        .from('help_search_analytics')
        .select('search_query, results_count')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: articlesData } = await supabase
        .from('help_articles')
        .select('id, title, content, category, tags')
        .eq('status', 'published')
        .eq('featured', true)
        .limit(3);

      // Create dynamic suggestions based on popular searches and featured articles
      const dynamicSuggestions: ContextualSuggestion[] = [];
      
      if (articlesData) {
        articlesData.forEach((article, index) => {
          dynamicSuggestions.push({
            id: `featured-${article.id}`,
            title: article.title,
            description: article.content.substring(0, 100) + '...',
            type: 'info',
            priority: 6 - index,
            articleId: article.id,
            action: { label: 'Read Article', url: `/help?id=${article.id}` }
          });
        });
      }

      // Combine and sort suggestions
      const allSuggestions = [...routeSuggestions, ...dynamicSuggestions]
        .filter(s => !dismissedSuggestions.includes(s.id))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);

      setSuggestions(allSuggestions);
    } catch (error) {
      console.error('Error loading contextual suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = (suggestionId: string) => {
    const newDismissed = [...dismissedSuggestions, suggestionId];
    setDismissedSuggestions(newDismissed);
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    
    // Store dismissed suggestions in localStorage
    localStorage.setItem('dismissed-help-suggestions', JSON.stringify(newDismissed));
  };

  const handleSuggestionClick = async (suggestion: ContextualSuggestion) => {
    // Track interaction
    try {
      await supabase
        .from('help_search_analytics')
        .insert({
          search_query: suggestion.title,
          results_count: 1,
          clicked_article_id: suggestion.articleId,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });
    } catch (error) {
      console.error('Error tracking suggestion click:', error);
    }

    // Navigate to the suggestion
    if (suggestion.action) {
      window.location.href = suggestion.action.url;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case 'tutorial':
        return <HelpCircle className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <HelpCircle className="h-4 w-4 text-red-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-primary" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'tip':
        return 'warning';
      case 'tutorial':
        return 'info';
      case 'warning':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-lg border-2">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Smart Help</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {suggestions.length} tips
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </div>
              <CardDescription>
                Contextual help for {currentPage.replace('/', '')} section
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : (
                suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeIcon(suggestion.type)}
                          <h4 className="font-medium text-sm">{suggestion.title}</h4>
                          <Badge variant={getTypeColor(suggestion.type) as any} className="text-xs">
                            {suggestion.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {suggestion.description}
                        </p>
                        {suggestion.action && (
                          <div className="flex items-center gap-1 text-xs text-primary group-hover:underline">
                            <span>{suggestion.action.label}</span>
                            <ExternalLink className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismiss(suggestion.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/help'}
                  className="text-xs"
                >
                  View All Help
                </Button>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Close
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}