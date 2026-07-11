import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Clock, FileText, Package, Wrench, Plus, DollarSign, Edit, History, Image as ImageIcon, Video } from 'lucide-react';
import { format } from 'date-fns';
import { PartsRequestManager } from '@/components/maintenance/PartsRequestManager';
import { MaintenanceRequestActivityFeed } from '@/components/maintenance/MaintenanceRequestActivityFeed';
import { AddUpdateDialog } from '@/components/maintenance/AddUpdateDialog';
import { EditMaintenanceRequestDialog } from './EditMaintenanceRequestDialog';
import { MaintenanceRequestHistoryDialog } from './MaintenanceRequestHistoryDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

interface ViewMaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  onConvert: () => void;
  onRefetch: () => void;
}

export function ViewMaintenanceRequestDialog({ 
  open, 
  onOpenChange, 
  request,
  onConvert,
  onRefetch
}: ViewMaintenanceRequestDialogProps) {
  const [addUpdateOpen, setAddUpdateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  if (!request) return null;

  const isOriginalSubmitter = currentUserId === request.requested_by;

  const parts = request.parts_requested || [];

  // Fetch updates/activity for this request
  const { data: updates, isLoading: updatesLoading, refetch: refetchUpdates } = useQuery({
    queryKey: ['maintenance-request-updates', request.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_request_updates' as any)
        .select('*')
        .eq('maintenance_request_id', request.id)
        .order('created_at', { ascending: false});
      
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: open
  });

  const handleUpdateAdded = () => {
    refetchUpdates();
    onRefetch();
  };

  const handleEditSuccess = () => {
    onRefetch();
    refetchUpdates();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <DialogTitle className="text-2xl">{request.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Request #{request.request_number}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 flex-wrap justify-end">
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
                {isOriginalSubmitter && request.status === 'pending' && (
                  <div className="flex gap-2 justify-end">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditOpen(true)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setHistoryOpen(true)}
                    >
                      <History className="h-3 w-3 mr-1" />
                      History
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="details" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="activity">
                Activity
                {updates && updates.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{updates.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="parts">Parts</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Description */}
              {request.description && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Description
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                    {request.description}
                  </p>
                </div>
              )}

              {/* Reported By Person */}
              {request.reported_by_person && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Reported By
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {request.reported_by_person}
                  </p>
                </div>
              )}

              {/* Request Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Requested By
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {request.requested_by_name || 'N/A'}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Request Date
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {format(new Date(request.requested_at || request.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>

                {request.assigned_to_name && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <User className="h-4 w-4" />
                      Assigned To
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {request.assigned_to_name}
                    </p>
                  </div>
                )}

                {request.estimated_hours && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Estimated Hours
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {request.estimated_hours} hrs
                    </p>
                  </div>
                )}

                {request.estimated_cost && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="h-4 w-4" />
                      Estimated Cost
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      ${request.estimated_cost.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {/* Issues Found */}
              {request.issues_found && Array.isArray(request.issues_found) && request.issues_found.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Issues Found
                  </div>
                  <ul className="list-disc list-inside pl-6 space-y-1">
                    {request.issues_found.map((issue: any, index: number) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        {typeof issue === 'string' ? issue : issue.description || JSON.stringify(issue)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Attachments */}
              {request.attachments && Array.isArray(request.attachments) && request.attachments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Attachments ({request.attachments.length})
                  </div>
                  <div className="space-y-4 pl-6">
                    {request.attachments.map((attachment: any, index: number) => {
                      const isImage = attachment.type?.startsWith('image/') || attachment.file_type?.startsWith('image/');
                      const isVideo = attachment.type?.startsWith('video/') || attachment.file_type?.startsWith('video/');
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {isImage ? (
                              <ImageIcon className="h-3 w-3" />
                            ) : isVideo ? (
                              <Video className="h-3 w-3" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                            <span className="font-medium">{attachment.name || `Attachment ${index + 1}`}</span>
                          </div>
                          
                          {isImage && (
                            <a 
                              href={attachment.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={attachment.url} 
                                alt={attachment.name || `Image ${index + 1}`}
                                className="w-full max-w-2xl rounded-lg border border-border hover:opacity-90 transition-opacity cursor-pointer"
                                loading="lazy"
                              />
                            </a>
                          )}
                          
                          {isVideo && (
                            <video 
                              controls 
                              className="w-full max-w-2xl rounded-lg border border-border"
                              preload="metadata"
                            >
                              <source src={attachment.url} type={attachment.type || attachment.file_type} />
                              Your browser does not support the video tag.
                            </video>
                          )}
                          
                          {!isImage && !isVideo && (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-md hover:bg-muted/80 transition-colors text-sm"
                            >
                              <FileText className="h-4 w-4" />
                              Download {attachment.name}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {request.status === 'pending' && (
                  <Button onClick={onConvert} className="flex-1">
                    <Wrench className="h-4 w-4 mr-2" />
                    Convert to Work Order
                  </Button>
                )}
                <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
                  Close
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Activity Timeline</h3>
                  <Button size="sm" onClick={() => setAddUpdateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Update
                  </Button>
                </div>
                <MaintenanceRequestActivityFeed 
                  updates={updates || []} 
                  isLoading={updatesLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="parts" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Parts</h3>
                </div>
                {parts.length > 0 ? (
                  <PartsRequestManager
                    maintenanceRequestId={request.id}
                    parts={parts}
                    onUpdate={onRefetch}
                    readOnly={request.status === 'completed' || request.status === 'rejected'}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No parts requested</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddUpdateDialog
        open={addUpdateOpen}
        onOpenChange={setAddUpdateOpen}
        maintenanceRequestId={request.id}
        shopId={request.shop_id}
        onUpdate={handleUpdateAdded}
      />

      <EditMaintenanceRequestDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        request={request}
        onSuccess={handleEditSuccess}
      />

      <MaintenanceRequestHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        requestId={request.id}
        currentVersion={request}
      />
    </>
  );
}
