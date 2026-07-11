import React, { useEffect, useState } from 'react';
import { useShopId } from '@/hooks/useShopId';
import { getMaintenanceActivities } from '@/services/maintenance/maintenanceActivityService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { History, Search, Filter, Flag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MaintenanceActivity {
  id: string;
  action: string;
  user_name: string;
  timestamp: string;
  details?: any;
  flagged: boolean;
  flag_reason?: string;
}

export function MaintenanceActivityHistory() {
  const { shopId } = useShopId();
  const [activities, setActivities] = useState<MaintenanceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    loadActivities();
  }, [shopId]);

  const loadActivities = async () => {
    if (!shopId) return;
    
    setLoading(true);
    const data = await getMaintenanceActivities(shopId);
    setActivities(data);
    setLoading(false);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = actionFilter === 'all' || 
                         (actionFilter === 'flagged' && activity.flagged) ||
                         activity.action.toLowerCase().includes(actionFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('Created')) return 'bg-green-100 text-green-800';
    if (action.includes('Updated')) return 'bg-blue-100 text-blue-800';
    if (action.includes('Deleted')) return 'bg-red-100 text-red-800';
    if (action.includes('Completed')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
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
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="flagged">Flagged Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground">
                {searchTerm || actionFilter !== 'all' 
                  ? 'No activities match your filters' 
                  : 'No maintenance activities recorded yet'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} className={activity.flagged ? 'border-amber-500' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getActionBadgeColor(activity.action)}>
                        {activity.action}
                      </Badge>
                      {activity.flagged && (
                        <Badge variant="outline" className="text-amber-600 border-amber-600">
                          <Flag className="h-3 w-3 mr-1" />
                          Flagged
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        by {activity.user_name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                    </p>
                    {activity.details && (
                      <p className="text-sm mt-2">{JSON.stringify(activity.details)}</p>
                    )}
                    {activity.flagged && activity.flag_reason && (
                      <p className="text-sm text-amber-600 mt-2">
                        <strong>Flag Reason:</strong> {activity.flag_reason}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
