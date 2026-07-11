import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckSquare,
  Target,
  Activity,
  Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

interface TeamMemberStats {
  id: string;
  display_name: string;
  role: string;
  totalWorkOrders: number;
  completedWorkOrders: number;
  averageCompletionTime: number;
  customerSatisfaction: number;
  efficiency: number;
  lastActive: string;
}

interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  averageEfficiency: number;
  totalWorkOrders: number;
  completionRate: number;
  averageSatisfaction: number;
}

export function TeamAnalytics() {
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthUser();

  useEffect(() => {
    fetchTeamAnalytics();
  }, [user?.id]);

  const fetchTeamAnalytics = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Get user's shop_id - handle both patterns
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) return;

      // Fetch team members from the same shop
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          job_title,
          updated_at
        `)
        .eq('shop_id', profile.shop_id)
        .neq('id', user.id);

      if (!teamMembers) return;

      // Fetch work order statistics for each team member
      const teamStatsPromises = teamMembers.map(async (member) => {
        const { data: workOrders } = await supabase
          .from('work_orders')
          .select('id, status, created_at, updated_at')
          .eq('technician_id', member.id);

        const totalWorkOrders = workOrders?.length || 0;
        const completedWorkOrders = workOrders?.filter(wo => wo.status === 'completed').length || 0;
        const completionRate = totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0;

        // Calculate real average completion time from completed work orders
        const completedWOs = workOrders?.filter(wo => wo.status === 'completed' && wo.created_at && wo.updated_at) || [];
        let averageCompletionTime = 0;
        if (completedWOs.length > 0) {
          const totalHours = completedWOs.reduce((sum, wo) => {
            const created = new Date(wo.created_at).getTime();
            const updated = new Date(wo.updated_at).getTime();
            const hours = (updated - created) / (1000 * 60 * 60);
            return sum + Math.max(0, hours);
          }, 0);
          averageCompletionTime = Math.round(totalHours / completedWOs.length);
        }

        // Fetch real customer satisfaction from feedback_responses table
        const { data: feedbackData } = await supabase
          .from('feedback_responses')
          .select('overall_rating, work_order_id')
          .not('overall_rating', 'is', null);
        
        // Filter feedback for work orders handled by this technician
        const { data: memberWorkOrderIds } = await supabase
          .from('work_orders')
          .select('id')
          .eq('technician_id', member.id);
        
        const memberWoIds = new Set(memberWorkOrderIds?.map(wo => wo.id) || []);
        const memberFeedback = feedbackData?.filter(f => f.work_order_id && memberWoIds.has(f.work_order_id)) || [];
        
        let customerSatisfaction = 0;
        if (memberFeedback.length > 0) {
          const avgRating = memberFeedback.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / memberFeedback.length;
          customerSatisfaction = Math.round((avgRating / 5) * 100); // Convert 5-star to percentage
        }

        // Calculate efficiency based on completion rate and on-time delivery
        const efficiency = Math.round(completionRate * 0.9 + (customerSatisfaction > 0 ? customerSatisfaction * 0.1 : completionRate * 0.1));

        return {
          id: member.id,
          display_name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Unknown',
          role: member.job_title || 'Team Member',
          totalWorkOrders,
          completedWorkOrders,
          averageCompletionTime,
          customerSatisfaction,
          efficiency,
          lastActive: member.updated_at || new Date().toISOString()
        };
      });

      const resolvedTeamStats = await Promise.all(teamStatsPromises);
      setTeamStats(resolvedTeamStats);

      // Calculate team metrics
      const totalMembers = teamMembers.length;
      const activeMembers = teamMembers.filter(m => {
        const lastActive = new Date(m.updated_at || 0);
        const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceActive <= 7; // Active within last 7 days
      }).length;

      const averageEfficiency = resolvedTeamStats.reduce((sum, stats) => sum + stats.efficiency, 0) / resolvedTeamStats.length || 0;
      const totalWorkOrdersCount = resolvedTeamStats.reduce((sum, stats) => sum + stats.totalWorkOrders, 0);
      const totalCompletedOrders = resolvedTeamStats.reduce((sum, stats) => sum + stats.completedWorkOrders, 0);
      const completionRate = totalWorkOrdersCount > 0 ? (totalCompletedOrders / totalWorkOrdersCount) * 100 : 0;
      const averageSatisfaction = resolvedTeamStats.reduce((sum, stats) => sum + stats.customerSatisfaction, 0) / resolvedTeamStats.length || 0;

      setTeamMetrics({
        totalMembers,
        activeMembers,
        averageEfficiency,
        totalWorkOrders: totalWorkOrdersCount,
        completionRate,
        averageSatisfaction
      });
    } catch (error) {
      console.error('Error fetching team analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-64 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyBadgeVariant = (efficiency: number) => {
    if (efficiency >= 80) return 'default';
    if (efficiency >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Team Overview Metrics */}
      {teamMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{teamMetrics.totalMembers}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{teamMetrics.activeMembers}</p>
                  <p className="text-sm text-muted-foreground">Active This Week</p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{teamMetrics.completionRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
                <CheckSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{teamMetrics.averageSatisfaction.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Avg Satisfaction</p>
                </div>
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Team Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamStats.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No team members found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamStats.map((member) => (
                <div key={member.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{member.display_name}</h4>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                    <Badge variant={getEfficiencyBadgeVariant(member.efficiency)}>
                      {member.efficiency}% Efficiency
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Work Orders</p>
                      <p className="font-medium">{member.totalWorkOrders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium text-green-600">{member.completedWorkOrders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Time</p>
                      <p className="font-medium">{member.averageCompletionTime}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Satisfaction</p>
                      <p className="font-medium">{member.customerSatisfaction}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Performance</span>
                      <span className={getEfficiencyColor(member.efficiency)}>
                        {member.efficiency}%
                      </span>
                    </div>
                    <Progress value={member.efficiency} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}