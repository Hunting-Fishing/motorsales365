
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { ClipboardEdit, Clock, User, AlertTriangle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface WorkOrderActivityHistoryProps {
  workOrderId: string;
}

interface Activity {
  id: string;
  work_order_id: string;
  action: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export function WorkOrderActivityHistory({ workOrderId }: WorkOrderActivityHistoryProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('work_order_activities')
          .select('*')
          .eq('work_order_id', workOrderId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Map the response data to match the Activity interface
        const formattedActivities: Activity[] = (data || []).map((item: any) => ({
          id: item.id,
          work_order_id: item.work_order_id,
          action: item.action,
          user_id: item.user_id,
          user_name: item.user_name,
          created_at: item.timestamp || item.created_at // Handle both field names
        }));
        
        setActivities(formattedActivities);
      } catch (error) {
        console.error('Error fetching work order activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (workOrderId) {
      fetchActivities();
    }
  }, [workOrderId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg">Activity History</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-4">
            <p className="text-slate-500">Loading activities...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg">Activity History</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-slate-500">No activity recorded for this work order</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg">Activity History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0 divide-y">
          {activities.map((activity) => (
            <div key={activity.id} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <ClipboardEdit className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-slate-800">{activity.action}</span>
                </div>
                <span className="text-sm text-slate-500">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>
              <div className="flex items-center text-sm text-slate-500 ml-6">
                <User className="h-3 w-3 mr-1" />
                <span>{activity.user_name}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
