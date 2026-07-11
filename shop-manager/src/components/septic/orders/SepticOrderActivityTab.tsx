import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface SepticOrderActivityTabProps {
  orderId: string;
  shopId: string | null;
}

const statusBadge: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  arrived: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function SepticOrderActivityTab({ orderId, shopId }: SepticOrderActivityTabProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['septic-order-status-log', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('septic_order_status_log' as any)
        .select('*')
        .eq('service_order_id', orderId)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" /> Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No status changes recorded yet</p>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical timeline line */}
            <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
            {logs.map((log: any, i: number) => (
              <div key={log.id} className="relative pl-8 pb-6 last:pb-0">
                {/* Dot */}
                <div className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-background ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.previous_status && (
                      <>
                        <Badge variant="outline" className={`text-xs ${statusBadge[log.previous_status] || ''}`}>
                          {log.previous_status?.replace('_', ' ')}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <Badge variant="secondary" className={`text-xs ${statusBadge[log.new_status] || ''}`}>
                      {log.new_status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.changed_at), 'MMM d, yyyy h:mm a')}
                    {log.changed_by_name && <> · <span className="font-medium text-foreground">{log.changed_by_name}</span></>}
                  </p>
                  {log.notes && <p className="text-sm text-muted-foreground mt-1">{log.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
