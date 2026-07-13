import React from 'react';
import { format } from 'date-fns';
import { 
  MessageSquare, 
  Package, 
  UserPlus, 
  AlertCircle, 
  CheckCircle,
  Clock,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Update {
  id: string;
  update_type: string;
  update_text?: string;
  created_by_name: string;
  created_at: string;
  parts_ordered?: Array<{
    part_number: string;
    name: string;
    quantity: number;
    expected_arrival?: string;
    status?: string;
  }>;
  assigned_to_name?: string;
  attention_to_name?: string;
  old_status?: string;
  new_status?: string;
  attachments?: Array<any>;
}

interface MaintenanceRequestActivityFeedProps {
  updates: Update[];
  isLoading?: boolean;
}

const getUpdateIcon = (type: string) => {
  switch (type) {
    case 'comment':
      return <MessageSquare className="h-4 w-4" />;
    case 'parts_ordered':
      return <Package className="h-4 w-4" />;
    case 'assignment':
      return <UserPlus className="h-4 w-4" />;
    case 'status_change':
      return <TrendingUp className="h-4 w-4" />;
    case 'arrival_update':
      return <Clock className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getUpdateColor = (type: string) => {
  switch (type) {
    case 'comment':
      return 'text-blue-500';
    case 'parts_ordered':
      return 'text-green-500';
    case 'assignment':
      return 'text-purple-500';
    case 'status_change':
      return 'text-orange-500';
    case 'arrival_update':
      return 'text-cyan-500';
    default:
      return 'text-muted-foreground';
  }
};

export function MaintenanceRequestActivityFeed({ 
  updates, 
  isLoading 
}: MaintenanceRequestActivityFeedProps) {
  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading activity...</div>;
  }

  if (!updates || updates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update, index) => (
        <div key={update.id} className="relative">
          {/* Timeline connector */}
          {index !== updates.length - 1 && (
            <div className="absolute left-[11px] top-8 w-[2px] h-[calc(100%+1rem)] bg-border" />
          )}
          
          <div className="flex gap-3">
            {/* Icon */}
            <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center ${getUpdateColor(update.update_type)}`}>
              {getUpdateIcon(update.update_type)}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="font-medium text-sm">{update.created_by_name}</span>
                  {update.update_type === 'status_change' && update.old_status && update.new_status && (
                    <span className="text-sm text-muted-foreground ml-2">
                      changed status from <Badge variant="outline" className="mx-1">{update.old_status}</Badge>
                      to <Badge variant="outline" className="mx-1">{update.new_status}</Badge>
                    </span>
                  )}
                  {update.update_type === 'assignment' && update.assigned_to_name && (
                    <span className="text-sm text-muted-foreground ml-2">
                      assigned to <span className="font-medium">{update.assigned_to_name}</span>
                    </span>
                  )}
                  {update.update_type === 'comment' && (
                    <span className="text-sm text-muted-foreground ml-2">commented</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(update.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              
              {/* Update text */}
              {update.update_text && (
                <p className="text-sm text-muted-foreground mt-1">{update.update_text}</p>
              )}
              
              {/* Parts ordered details */}
              {update.parts_ordered && update.parts_ordered.length > 0 && (
                <Card className="mt-2 p-3 bg-muted/30">
                  <div className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Parts Ordered
                  </div>
                  <div className="space-y-2">
                    {update.parts_ordered.map((part, idx) => (
                      <div key={idx} className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{part.name}</span>
                          <Badge variant="outline" className="text-xs">{part.status || 'ordered'}</Badge>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-3">
                          <span>PN: {part.part_number}</span>
                          <span>Qty: {part.quantity}</span>
                          {part.expected_arrival && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              ETA: {format(new Date(part.expected_arrival), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              
              {/* Attention notification */}
              {update.attention_to_name && (
                <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Attention: {update.attention_to_name}
                </div>
              )}
              
              {/* Attachments */}
              {update.attachments && update.attachments.length > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  <span>{update.attachments.length} attachment{update.attachments.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
