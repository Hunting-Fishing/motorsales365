import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, TrendingDown, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import AddRecommendationDialog from './AddRecommendationDialog';

interface CustomerRecommendationsTabProps {
  customerId: string;
}

const statusColors: Record<string, string> = {
  proposed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  accepted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  declined: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const typeLabels: Record<string, string> = {
  cost_saving: '💰 Cost Saving',
  upgrade: '⬆️ System Upgrade',
  maintenance_plan: '🔧 Maintenance Plan',
  system_replacement: '🔄 Replacement',
  environmental: '🌿 Environmental',
};

export default function CustomerRecommendationsTab({ customerId }: CustomerRecommendationsTabProps) {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: recommendations = [] } = useQuery({
    queryKey: ['septic-cost-recommendations', customerId, shopId],
    queryFn: async () => {
      if (!customerId || !shopId) return [];
      const { data, error } = await supabase
        .from('septic_cost_recommendations')
        .select('*')
        .eq('customer_id', customerId)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!shopId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'accepted') updates.accepted_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('septic_cost_recommendations').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['septic-cost-recommendations', customerId] }),
  });

  const totalPotentialSavings = recommendations
    .filter((r: any) => r.status !== 'declined' && r.status !== 'completed')
    .reduce((sum: number, r: any) => sum + Number(r.estimated_savings || 0), 0);

  const completedSavings = recommendations
    .filter((r: any) => r.status === 'completed')
    .reduce((sum: number, r: any) => sum + Number(r.estimated_savings || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-600">${totalPotentialSavings.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Potential Annual Savings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold text-green-600">${completedSavings.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Realized Savings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{recommendations.filter((r: any) => r.status === 'proposed').length}</p>
            <p className="text-xs text-muted-foreground">Pending Proposals</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Recommendation
        </Button>
      </div>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingDown className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No recommendations yet. Analyze the customer's history to suggest cost savings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec: any) => (
            <Card key={rec.id}>
              <CardContent className="p-5">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{rec.title}</span>
                        <Badge className={statusColors[rec.status] || ''} variant="secondary">
                          {rec.status?.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[rec.recommendation_type] || rec.recommendation_type}
                        </Badge>
                      </div>
                      {rec.description && <p className="text-sm text-muted-foreground">{rec.description}</p>}
                    </div>
                    {rec.status === 'proposed' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'accepted' })}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'declined' })}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                    {rec.status === 'accepted' && (
                      <Button
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => updateStatusMutation.mutate({ id: rec.id, status: 'completed' })}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>

                  {/* ROI Breakdown */}
                  {(rec.current_annual_cost || rec.projected_annual_cost || rec.implementation_cost) && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted/50 rounded-lg">
                      {rec.current_annual_cost && (
                        <div>
                          <p className="text-xs text-muted-foreground">Current Annual</p>
                          <p className="text-sm font-medium">${Number(rec.current_annual_cost).toFixed(0)}/yr</p>
                        </div>
                      )}
                      {rec.projected_annual_cost && (
                        <div>
                          <p className="text-xs text-muted-foreground">Projected Annual</p>
                          <p className="text-sm font-medium text-emerald-600">${Number(rec.projected_annual_cost).toFixed(0)}/yr</p>
                        </div>
                      )}
                      {rec.estimated_savings && (
                        <div>
                          <p className="text-xs text-muted-foreground">Annual Savings</p>
                          <p className="text-sm font-bold text-emerald-600">${Number(rec.estimated_savings).toFixed(0)}/yr</p>
                        </div>
                      )}
                      {rec.implementation_cost && (
                        <div>
                          <p className="text-xs text-muted-foreground">Implementation</p>
                          <p className="text-sm font-medium">${Number(rec.implementation_cost).toFixed(0)}</p>
                        </div>
                      )}
                      {rec.payback_period_months && (
                        <div>
                          <p className="text-xs text-muted-foreground">Payback Period</p>
                          <p className="text-sm font-medium">{rec.payback_period_months} months</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddRecommendationDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        customerId={customerId}
      />
    </div>
  );
}
