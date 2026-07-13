import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, Star, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface Recommendation {
  id: string;
  type: 'product' | 'service' | 'cross_sell' | 'upsell';
  target_id: string;
  recommended_items: any[];
  confidence: number;
  reason: string;
  created_at: string;
  is_active: boolean;
}

export const AIRecommendations = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRecommendations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { action: 'get_recommendations' }
      });

      if (error) throw error;
      
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI recommendations",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const generateRecommendations = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { action: 'generate_recommendations' }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "New AI recommendations generated",
      });
      
      await fetchRecommendations();
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations",
        variant: "destructive"
      });
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product':
        return <Star className="w-4 h-4" />;
      case 'service':
        return <Lightbulb className="w-4 h-4" />;
      case 'cross_sell':
      case 'upsell':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'product':
        return 'bg-blue-500';
      case 'service':
        return 'bg-green-500';
      case 'cross_sell':
        return 'bg-purple-500';
      case 'upsell':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
          <CardDescription>Loading recommendations...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              Personalized suggestions to grow your business
            </CardDescription>
          </div>
          <Button 
            onClick={generateRecommendations}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No recommendations available</p>
            <p className="text-sm text-muted-foreground">
              Generate new recommendations based on your business data
            </p>
            <Button 
              onClick={generateRecommendations}
              disabled={isRefreshing}
              className="mt-4"
            >
              Generate Recommendations
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${getTypeColor(rec.type)} text-white`}>
                      {getTypeIcon(rec.type)}
                    </div>
                    <div>
                      <Badge variant="outline" className="capitalize">
                        {rec.type.replace('_', ' ')}
                      </Badge>
                      <div className={`text-sm font-semibold ${getConfidenceColor(rec.confidence)}`}>
                        {rec.confidence}% confidence
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm">{rec.reason}</p>
                
                {rec.recommended_items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Recommended Items:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {rec.recommended_items.slice(0, 4).map((item, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <span className="text-sm">{item.name || item.title || 'Item'}</span>
                          {item.price && (
                            <span className="text-sm font-medium">${item.price}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button size="sm">
                    Apply Recommendation
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};