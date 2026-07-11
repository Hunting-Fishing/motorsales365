import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, ThumbsDown, Calendar, User, FileText, Clock, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { STATUS_OPTIONS, CATEGORY_OPTIONS } from '@/types/feature-requests';
import type { FeatureRequest } from '@/types/feature-requests';

interface ChangeRequestDetailProps {
  request: FeatureRequest;
}

export function ChangeRequestDetail({ request }: ChangeRequestDetailProps) {
  const { voteOnFeatureRequest } = useFeatureRequests();
  const [isVoting, setIsVoting] = React.useState(false);

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    setIsVoting(true);
    await voteOnFeatureRequest(request.id, voteType);
    setIsVoting(false);
  };

  const statusOption = STATUS_OPTIONS.find((s) => s.value === request.status);
  const categoryOption = CATEGORY_OPTIONS.find((c) => c.value === request.category);

  const getStatusTimeline = () => {
    const statuses = ['submitted', 'under_review', 'approved', 'in_development', 'testing', 'completed'];
    const currentIndex = statuses.indexOf(request.status);
    
    if (request.status === 'rejected' || request.status === 'on_hold') {
      return null; // Don't show timeline for rejected/on-hold
    }

    return (
      <div className="flex items-center gap-1 mt-4">
        {statuses.map((status, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const statusLabel = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
          
          return (
            <React.Fragment key={status}>
              <div
                className={`flex-shrink-0 w-3 h-3 rounded-full ${
                  isCompleted ? 'bg-primary' : 'bg-muted'
                } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                title={statusLabel}
              />
              {index < statuses.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    index < currentIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Submitted: {format(new Date(request.created_at), 'MMM d, yyyy')}</span>
        </div>
        {request.submitter_name && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>By: {request.submitter_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Badge variant="outline">{categoryOption?.label || request.category}</Badge>
        </div>
      </div>

      {/* Status Timeline */}
      {getStatusTimeline()}

      <Separator />

      {/* Main Content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column - Description */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Description</h4>
            <p className="text-sm">{request.description}</p>
          </div>

          {request.reason_for_change && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-1">Reason for Change</h4>
              <p className="text-sm">{request.reason_for_change}</p>
            </div>
          )}

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">Attachments</h4>
              <div className="flex flex-wrap gap-2">
                {request.attachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-20 h-20 rounded-lg overflow-hidden border hover:border-primary transition-colors"
                  >
                    <img
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Progress Info */}
        <div className="space-y-4">
          {request.progress_notes && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" />
                Progress Notes
              </h4>
              <p className="text-sm">{request.progress_notes}</p>
            </div>
          )}

          {request.developer_actions && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4" />
                Developer Actions
              </h4>
              <p className="text-sm">{request.developer_actions}</p>
            </div>
          )}

          {request.admin_notes && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2 text-blue-600">
                <FileText className="h-4 w-4" />
                Notes from Team
              </h4>
              <p className="text-sm">{request.admin_notes}</p>
            </div>
          )}

          {!request.progress_notes && !request.developer_actions && !request.admin_notes && (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No updates yet. We'll post progress here.</p>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Voting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleVote('upvote')}
            disabled={isVoting}
            className="gap-2"
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{request.upvotes || 0}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleVote('downvote')}
            disabled={isVoting}
            className="gap-2"
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{request.downvotes || 0}</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Vote to help us prioritize this request
        </p>
      </div>
    </div>
  );
}
