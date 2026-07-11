import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShopId } from '@/hooks/useShopId';
import { getMaintenanceActivities } from '@/services/maintenance/maintenanceActivityService';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { History, Search, Filter, RefreshCcw } from 'lucide-react';

export function MaintenanceHistory() {
  const { shopId } = useShopId();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ['maintenance-activities', shopId],
    queryFn: () => getMaintenanceActivities(shopId!),
    enabled: !!shopId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!shopId) return;

    const channel = supabase
      .channel('maintenance_activities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_activities',
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, refetch]);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      actionFilter === 'all' || 
      (actionFilter === 'flagged' && activity.flagged) ||
      activity.action.toLowerCase().includes(actionFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.toLowerCase().includes('create')) return 'bg-green-100 text-green-800';
    if (action.toLowerCase().includes('update')) return 'bg-blue-100 text-blue-800';
    if (action.toLowerCase().includes('delete')) return 'bg-red-100 text-red-800';
    if (action.toLowerCase().includes('complete')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <History className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Loading activity history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="flagged">Flagged Only</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                title="Refresh"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">No activities found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getActionBadgeColor(activity.action)}>
                            {activity.action}
                          </Badge>
                          {activity.flagged && (
                            <Badge variant="destructive">Flagged</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {activity.user_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(activity.timestamp), 'MMM dd, yyyy • h:mm a')}
                        </p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {JSON.stringify(activity.details, null, 2)}
                          </p>
                        )}
                        {activity.flag_reason && (
                          <p className="text-xs text-destructive mt-2">
                            Flag reason: {activity.flag_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
