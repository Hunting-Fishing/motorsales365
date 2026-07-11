import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, AlertCircle, Wrench, Calendar, User, ArrowRight, Eye, Image, Video, Package, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { CreateMaintenanceRequestDialog } from './CreateMaintenanceRequestDialog';
import { ConvertToWorkOrderDialog } from './ConvertToWorkOrderDialog';
import { ViewMaintenanceRequestDialog } from './ViewMaintenanceRequestDialog';

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

interface EquipmentWorkRequestsProps {
  equipmentId: string;
  equipmentName: string;
}

export function EquipmentWorkRequests({ equipmentId, equipmentName }: EquipmentWorkRequestsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['equipment-maintenance-requests', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
          <div className="flex items-center">
            <Wrench className="h-5 w-5 mr-2 text-slate-500" />
            <CardTitle className="text-lg">Work Requests</CardTitle>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-1">No work requests yet</p>
              <p className="text-sm">Submit a maintenance request to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request: any) => {
                // Check for attachments
                const attachments = request.attachments || [];
                const hasImages = attachments.some((att: any) => 
                  att?.type?.startsWith('image/') || 
                  att?.file_type?.startsWith('image/')
                );
                const hasVideos = attachments.some((att: any) => 
                  att?.type?.startsWith('video/') || 
                  att?.file_type?.startsWith('video/')
                );
                const partsCount = request.parts_requested?.length || 0;

                return (
                  <Card key={request.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{request.title}</h3>
                          <Badge className={priorityColors[request.priority as keyof typeof priorityColors]}>
                            {request.priority}
                          </Badge>
                          <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                          {request.request_type && (
                            <Badge variant="outline" className="capitalize">
                              {request.request_type.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        {request.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional Info Row */}
                    <div className="flex items-center gap-4 text-xs border-t pt-3 pb-2 flex-wrap">
                      <span className="font-mono text-muted-foreground">#{request.request_number}</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.requested_at), 'MMM d, yyyy')}
                      </div>
                      {request.requested_by_name && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          {request.requested_by_name}
                        </div>
                      )}
                      {request.estimated_cost && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>${request.estimated_cost}</span>
                        </div>
                      )}
                      {request.estimated_hours && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{request.estimated_hours}h</span>
                        </div>
                      )}
                      {partsCount > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span>{partsCount} part{partsCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {(hasImages || hasVideos) && (
                        <div className="flex items-center gap-2 ml-auto">
                          {hasImages && (
                            <div className="flex items-center gap-1 text-primary">
                              <Image className="h-4 w-4" />
                            </div>
                          )}
                          {hasVideos && (
                            <div className="flex items-center gap-1 text-primary">
                              <Video className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {request.scheduled_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 pb-2">
                        <Calendar className="h-3 w-3" />
                        <span>Scheduled: {format(new Date(request.scheduled_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}

                  {request.notes && (
                    <div className="mt-3 text-sm border-t pt-3">
                      <span className="font-medium">Notes: </span>
                      <span className="text-muted-foreground">{request.notes}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {request.status === 'pending' && (
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setViewDialogOpen(true);
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => {
                          setSelectedRequest(request);
                          setConvertDialogOpen(true);
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Convert to Work Order
                      </Button>
                    </div>
                  )}
                  
                  {/* View button for non-pending requests */}
                  {request.status !== 'pending' && (
                    <div className="mt-3 pt-3 border-t">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setViewDialogOpen(true);
                        }}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  )}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateMaintenanceRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        equipmentId={equipmentId}
        equipmentName={equipmentName}
        onSuccess={refetch}
      />

      {selectedRequest && (
        <>
          <ConvertToWorkOrderDialog
            open={convertDialogOpen}
            onOpenChange={setConvertDialogOpen}
            request={selectedRequest}
            onSuccess={refetch}
          />
          
          <ViewMaintenanceRequestDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            request={selectedRequest}
            onConvert={() => {
              setViewDialogOpen(false);
              setConvertDialogOpen(true);
            }}
            onRefetch={refetch}
          />
        </>
      )}
    </>
  );
}
