import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, ShoppingCart, DollarSign, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import type { EnterpriseStats } from '@/types/phase4';
import { cn } from '@/lib/utils';

export const EnterpriseDashboard = () => {
  const [stats, setStats] = useState<EnterpriseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await enterpriseService.getEnterpriseStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching enterprise stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-6 bg-muted rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Failed to load enterprise statistics.</p>
        </CardContent>
      </Card>
    );
  }

  const healthColor = {
    healthy: 'text-emerald-600',
    warning: 'text-yellow-600', 
    critical: 'text-red-600'
  }[stats.systemHealth];

  const healthBadgeVariant = {
    healthy: 'default' as const,
    warning: 'secondary' as const,
    critical: 'destructive' as const
  }[stats.systemHealth];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active users
            </p>
            <Progress 
              value={(stats.activeUsers / stats.totalUsers) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={healthBadgeVariant} className="capitalize">
                {stats.systemHealth}
              </Badge>
              {stats.securityEvents > 0 && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {stats.securityEvents} alerts
                </div>
              )}
            </div>
            <p className={cn("text-xs mt-2", healthColor)}>
              {stats.systemHealth === 'healthy' && 'All systems operational'}
              {stats.systemHealth === 'warning' && 'Some issues detected'}
              {stats.systemHealth === 'critical' && 'Immediate attention required'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors">
                <Users className="h-6 w-6 mb-2 text-primary" />
                <div className="font-medium">Manage Users</div>
                <div className="text-sm text-muted-foreground">Add, edit, or remove users</div>
              </button>
              <button className="p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors">
                <Shield className="h-6 w-6 mb-2 text-primary" />
                <div className="font-medium">Security Review</div>
                <div className="text-sm text-muted-foreground">Check security events</div>
              </button>
              <button className="p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors">
                <TrendingUp className="h-6 w-6 mb-2 text-primary" />
                <div className="font-medium">Generate Report</div>
                <div className="text-sm text-muted-foreground">Create custom reports</div>
              </button>
              <button className="p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors">
                <AlertTriangle className="h-6 w-6 mb-2 text-primary" />
                <div className="font-medium">View Alerts</div>
                <div className="text-sm text-muted-foreground">Check system alerts</div>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Real-time system health indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database Performance</span>
                <div className="flex items-center space-x-2">
                  <Progress value={92} className="w-20" />
                  <span className="text-xs text-muted-foreground">92%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Response Time</span>
                <div className="flex items-center space-x-2">
                  <Progress value={88} className="w-20" />
                  <span className="text-xs text-muted-foreground">88ms</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cache Hit Rate</span>
                <div className="flex items-center space-x-2">
                  <Progress value={95} className="w-20" />
                  <span className="text-xs text-muted-foreground">95%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Security Score</span>
                <div className="flex items-center space-x-2">
                  <Progress value={stats.securityEvents === 0 ? 100 : Math.max(60, 100 - stats.securityEvents * 5)} className="w-20" />
                  <span className="text-xs text-muted-foreground">
                    {stats.securityEvents === 0 ? 100 : Math.max(60, 100 - stats.securityEvents * 5)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};