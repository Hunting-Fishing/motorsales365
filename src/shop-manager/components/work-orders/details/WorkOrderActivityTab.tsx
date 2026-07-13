
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getWorkOrderActivities } from '@/services/workOrder/workOrderActivityService';
import { Loader2 } from 'lucide-react';

interface WorkOrderActivity {
  id: string;
  work_order_id: string;
  action: string;
  user_id: string;
  user_name: string;
  timestamp: string;
  flagged: boolean;
  flag_reason?: string;
}

interface WorkOrderActivityTabProps {
  workOrderId: string;
}

export function WorkOrderActivityTab({ workOrderId }: WorkOrderActivityTabProps) {
  const [activities, setActivities] = useState<WorkOrderActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const activitiesData = await getWorkOrderActivities(workOrderId);
        setActivities(activitiesData);
      } catch (error) {
        console.error('Error fetching work order activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    if (workOrderId) {
      fetchActivities();
    }
  }, [workOrderId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity recorded for this work order.
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{activity.action}</Badge>
                    {activity.flagged && (
                      <Badge variant="destructive">Flagged</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    by {activity.user_name}
                  </p>
                  {activity.flag_reason && (
                    <p className="text-sm text-red-600 mt-1">
                      Reason: {activity.flag_reason}
                    </p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
