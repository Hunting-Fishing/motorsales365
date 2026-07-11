import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  confidence: number;
  impact_level: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations: string[];
  created_at: string;
  viewed: boolean;
  acknowledged: boolean;
}

export const AIInsights = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setInsights((data || []) as AIInsight[]);
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast({
        title: "Error",
        description: "Failed to fetch AI insights",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const markAsAcknowledged = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({ 
          acknowledged: true, 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', insightId);

      if (error) throw error;
      
      setInsights(prev => prev.map(insight => 
        insight.id === insightId 
          ? { ...insight, acknowledged: true }
          : insight
      ));
    } catch (error) {
      console.error('Error acknowledging insight:', error);
      toast({
        title: "Error",
        description: "Failed to acknowledge insight",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="w-4 h-4" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4" />;
      case 'opportunity':
        return <Lightbulb className="w-4 h-4" />;
      case 'risk':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trend':
        return 'bg-blue-500';
      case 'anomaly':
        return 'bg-yellow-500';
      case 'opportunity':
        return 'bg-green-500';
      case 'risk':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const filteredInsights = insights.filter(insight => {
    if (filter === 'all') return true;
    if (filter === 'unacknowledged') return !insight.acknowledged;
    if (filter === 'actionable') return insight.actionable;
    return insight.type === filter;
  });

  const filterOptions = [
    { value: 'all', label: 'All Insights' },
    { value: 'unacknowledged', label: 'Unacknowledged' },
    { value: 'actionable', label: 'Actionable' },
    { value: 'trend', label: 'Trends' },
    { value: 'opportunity', label: 'Opportunities' },
    { value: 'risk', label: 'Risks' },
    { value: 'anomaly', label: 'Anomalies' }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Business Insights</CardTitle>
          <CardDescription>Loading insights...</CardDescription>
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
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          AI Business Insights
        </CardTitle>
        <CardDescription>
          AI-generated trends, opportunities, and recommendations for your business
        </CardDescription>
        
        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap pt-2">
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredInsights.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No insights available</p>
            <p className="text-sm text-muted-foreground">
              AI insights will appear here as your business data grows
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInsights.map((insight) => (
              <div 
                key={insight.id} 
                className={`border rounded-lg p-4 space-y-3 ${
                  !insight.acknowledged ? 'border-l-4 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getTypeColor(insight.type)} text-white`}>
                      {getTypeIcon(insight.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{insight.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="capitalize">
                          {insight.type}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`capitalize ${getImpactColor(insight.impact_level)}`}
                        >
                          {insight.impact_level} impact
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {insight.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {insight.actionable && (
                      <Badge variant="secondary">Actionable</Badge>
                    )}
                    {insight.acknowledged && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                
                {insight.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium">Recommendations:</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {insight.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(insight.created_at).toLocaleDateString()} at{' '}
                    {new Date(insight.created_at).toLocaleTimeString()}
                  </span>
                  
                  {!insight.acknowledged && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => markAsAcknowledged(insight.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};