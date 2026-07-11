import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Clock, User, FileText, Image as ImageIcon, Video } from 'lucide-react';

interface MaintenanceRequestHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  currentVersion: any;
}

export function MaintenanceRequestHistoryDialog({
  open,
  onOpenChange,
  requestId,
  currentVersion
}: MaintenanceRequestHistoryDialogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['maintenance-request-history', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_request_history')
        .select('*')
        .eq('maintenance_request_id', requestId)
        .order('version_number', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open
  });

  const versions = [
    {
      version_number: 'Current',
      ...currentVersion,
      edited_at: currentVersion.updated_at || currentVersion.created_at,
      edited_by_name: 'Current Version',
      change_summary: 'Latest version'
    },
    ...(history || [])
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            All changes to this maintenance request are tracked here
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    version.version_number === 'Current' 
                      ? 'bg-primary/5 border-primary' 
                      : 'bg-muted/30'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={version.version_number === 'Current' ? 'default' : 'secondary'}>
                          {version.version_number === 'Current' 
                            ? 'Current Version' 
                            : `Version ${version.version_number}`}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {version.priority}
                        </Badge>
                      </div>
                      {version.change_summary && (
                        <p className="text-sm text-muted-foreground italic">
                          {version.change_summary}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(version.edited_at), 'MMM dd, yyyy h:mm a')}
                      </div>
                      {version.edited_by_name && version.version_number !== 'Current' && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {version.edited_by_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Title</h4>
                      <p className="text-sm text-foreground">{version.title}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {version.description}
                      </p>
                    </div>

                    {version.reported_by_person && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Reported By</h4>
                        <p className="text-sm text-muted-foreground">
                          {version.reported_by_person}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Type: </span>
                        <span className="capitalize text-muted-foreground">
                          {version.request_type?.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold">Priority: </span>
                        <span className="capitalize text-muted-foreground">
                          {version.priority}
                        </span>
                      </div>
                    </div>

                    {/* Attachments */}
                    {version.attachments && Array.isArray(version.attachments) && version.attachments.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Attachments ({version.attachments.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {version.attachments.map((attachment: any, idx: number) => (
                            <a
                              key={idx}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-background rounded border hover:bg-muted transition-colors"
                            >
                              {attachment.type?.startsWith('image/') ? (
                                <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="text-xs truncate">{attachment.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
