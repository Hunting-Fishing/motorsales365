import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { useScheduling } from '@/hooks/useScheduling';
import { useToast } from '@/hooks/use-toast';
import { AddTimeOffDialog } from './AddTimeOffDialog';
import { useAuthUser } from '@/hooks/useAuthUser';
import type { TimeOffRequest } from '@/types/scheduling';

export function TimeOffRequests() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { timeOffRequests, loading, updateTimeOffRequest } = useScheduling();
  const { toast } = useToast();
  const { user } = useAuthUser();

  const handleApprove = async (request: TimeOffRequest) => {
    try {
      await updateTimeOffRequest(request.id, {
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      });

      toast({
        title: 'Success',
        description: 'Time off request approved'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request',
        variant: 'destructive'
      });
    }
  };

  const handleDeny = async (request: TimeOffRequest) => {
    try {
      await updateTimeOffRequest(request.id, {
        status: 'denied',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString()
      });

      toast({
        title: 'Success',
        description: 'Time off request denied'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to deny request',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      denied: 'destructive',
      cancelled: 'outline'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Time Off Requests</CardTitle>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Request Time Off
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading requests...</div>
          ) : timeOffRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No time off requests yet
            </div>
          ) : (
            <div className="space-y-3">
              {timeOffRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {request.profiles?.first_name} {request.profiles?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(request.start_date), 'MMM d, yyyy')} -{' '}
                      {format(new Date(request.end_date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {request.total_days} days • {request.time_off_types?.name}
                    </div>
                    {request.reason && (
                      <div className="text-sm mt-1">{request.reason}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    {request.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleApprove(request)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeny(request)}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTimeOffDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
