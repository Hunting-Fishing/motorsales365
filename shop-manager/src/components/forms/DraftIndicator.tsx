import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DraftIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasDraft: boolean;
  onClearDraft?: () => void;
  onSaveDraft?: () => void;
  showClearButton?: boolean;
  className?: string;
}

export const DraftIndicator: React.FC<DraftIndicatorProps> = ({
  isSaving,
  lastSaved,
  hasDraft,
  onClearDraft,
  onSaveDraft,
  showClearButton = true,
  className,
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isSaving ? (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </Badge>
      ) : lastSaved ? (
        <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
          <Cloud className="h-3 w-3 text-green-500" />
          Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
        </Badge>
      ) : hasDraft ? (
        <Badge variant="outline" className="flex items-center gap-1">
          <Cloud className="h-3 w-3" />
          Draft available
        </Badge>
      ) : (
        <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground">
          <CloudOff className="h-3 w-3" />
          No draft
        </Badge>
      )}

      {onSaveDraft && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSaveDraft}
          disabled={isSaving}
          className="h-7 text-xs"
        >
          Save now
        </Button>
      )}

      {showClearButton && hasDraft && onClearDraft && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearDraft}
          className="h-7 text-xs text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Clear draft
        </Button>
      )}
    </div>
  );
};

export default DraftIndicator;
