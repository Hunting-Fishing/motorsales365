import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-blue-500/10 text-blue-500',
  rejected: 'bg-red-500/10 text-red-500',
  in_progress: 'bg-purple-500/10 text-purple-500',
  completed: 'bg-green-500/10 text-green-500',
};

const priorityColors = {
  low: 'bg-gray-500/10 text-gray-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500',
};

export function MaintenanceRequestsList() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['maintenance-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Maintenance Requests</CardTitle>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No maintenance requests found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request: any) => (
              <Card key={request.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{request.title}</h3>
                      <Badge className={priorityColors[request.priority as keyof typeof priorityColors]}>
                        {request.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <span>#{request.request_number}</span>
                      <span>Requested: {format(new Date(request.requested_at), 'MMM d, yyyy')}</span>
                      {request.requested_by_name && <span>By: {request.requested_by_name}</span>}
                    </div>
                  </div>
                  <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
