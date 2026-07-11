import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  UserPlus, 
  Shield, 
  Building2, 
  Edit,
  Trash2,
  UserMinus
} from 'lucide-react';
import { useTeamHistory } from '@/hooks/useTeamHistory';

const getActivityIcon = (actionType: string) => {
  switch (actionType) {
    case 'profile_created':
      return { icon: UserPlus, color: 'text-green-600 bg-green-50' };
    case 'profile_updated':
      return { icon: Edit, color: 'text-orange-600 bg-orange-50' };
    case 'role_assigned':
      return { icon: Shield, color: 'text-blue-600 bg-blue-50' };
    case 'department_changed':
      return { icon: Building2, color: 'text-purple-600 bg-purple-50' };
    case 'status_change':
      return { icon: UserMinus, color: 'text-red-600 bg-red-50' };
    default:
      return { icon: Clock, color: 'text-gray-600 bg-gray-50' };
  }
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const activityTime = new Date(timestamp);
  const diffInMs = now.getTime() - activityTime.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInHours / 24;

  if (diffInHours < 1) {
    return 'Less than an hour ago';
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} hours ago`;
  } else if (diffInDays < 7) {
    return `${Math.floor(diffInDays)} days ago`;
  } else {
    return activityTime.toLocaleDateString();
  }
};

export function TeamActivityTimeline() {
  const { filteredHistory, loading } = useTeamHistory();

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-start gap-4">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredHistory.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">No recent team activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border"></div>
          
          <div className="space-y-6">
            {filteredHistory.slice(0, 6).map((activity, index) => {
              const { icon: Icon, color } = getActivityIcon(activity.action);
              
              return (
                <div key={activity.id} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${color} border-2 border-white shadow-sm`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  
                  {/* Activity content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">
                          {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                        <p className="text-sm text-muted-foreground">{activity.details}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>by {activity.userName}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(activity.timestamp)}</span>
                        </div>
                      </div>
                      
                      {index < 2 && (
                        <Badge variant="outline" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="text-center pt-4 border-t">
          <button className="text-sm text-muted-foreground hover:text-foreground">
            View all activity
          </button>
        </div>
      </CardContent>
    </Card>
  );
}