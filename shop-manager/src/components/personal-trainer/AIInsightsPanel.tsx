import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Dumbbell, Users, Trophy, ShoppingBag, TrendingUp, GraduationCap } from 'lucide-react';
import { usePTAIRecommendations, useGenerateInsight, InsightType } from '@/hooks/usePTAIInsights';
import ReactMarkdown from 'react-markdown';

interface AIInsightsPanelProps {
  clientId: string;
  shopId: string;
}

const INSIGHT_TABS: { type: InsightType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'program', label: 'Program', icon: <Dumbbell className="h-3.5 w-3.5" />, description: 'AI hybrid workout program' },
  { type: 'class', label: 'Classes', icon: <GraduationCap className="h-3.5 w-3.5" />, description: 'Recommended group classes' },
  { type: 'trainer', label: 'Trainer', icon: <Users className="h-3.5 w-3.5" />, description: 'Trainer match scores' },
  { type: 'upsell', label: 'Upsells', icon: <ShoppingBag className="h-3.5 w-3.5" />, description: 'Package recommendations' },
  { type: 'community', label: 'Community', icon: <Trophy className="h-3.5 w-3.5" />, description: 'Peer matching & challenges' },
  { type: 'progression', label: 'Progress', icon: <TrendingUp className="h-3.5 w-3.5" />, description: 'Progression analysis' },
];

export default function AIInsightsPanel({ clientId, shopId }: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<InsightType>('program');
  const { data: recommendations = [], isLoading } = usePTAIRecommendations(clientId, shopId, activeTab);
  const generateInsight = useGenerateInsight();

  const latestRec = recommendations[0];

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Insights Engine
        </CardTitle>
        <p className="text-xs text-muted-foreground">Taxonomy-powered recommendations based on fitness profile scores & biometrics</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InsightType)}>
          <TabsList className="grid w-full grid-cols-6 h-auto">
            {INSIGHT_TABS.map(tab => (
              <TabsTrigger key={tab.type} value={tab.type} className="text-[10px] sm:text-xs flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1 py-1.5 px-1">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {INSIGHT_TABS.map(tab => (
            <TabsContent key={tab.type} value={tab.type} className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{tab.description}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateInsight.mutate({ clientId, shopId, type: tab.type })}
                  disabled={generateInsight.isPending}
                  className="text-xs"
                >
                  {generateInsight.isPending && generateInsight.variables?.type === tab.type ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Generate
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : latestRec ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {new Date(latestRec.content.generated_at || latestRec.created_at).toLocaleDateString()}
                    </Badge>
                    {latestRec.confidence && (
                      <Badge variant="outline" className="text-[10px]">
                        {Math.round(latestRec.confidence * 100)}% confidence
                      </Badge>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none text-sm text-foreground bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                    <ReactMarkdown>{latestRec.content.text}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No insights generated yet</p>
                  <p className="text-xs text-muted-foreground">Click "Generate" to create AI-powered recommendations</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
