import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { InspectionPhotoUpload } from '../shared/InspectionPhotoUpload';
import type { ItemStatus } from '@/hooks/useForkliftInspections';

interface ForkliftInspectionItemProps {
  label: string;
  itemKey: string;
  value: ItemStatus;
  notes?: string;
  photos?: string[];
  previousStatus?: string | null;
  onChange: (key: string, value: ItemStatus) => void;
  onNotesChange: (key: string, notes: string) => void;
  onPhotosChange?: (key: string, photos: string[]) => void;
  icon?: React.ReactNode;
}

const STATUS_CONFIG = {
  good: {
    icon: CheckCircle2,
    label: 'Good',
    className: 'bg-green-500 hover:bg-green-600 text-white',
    activeClassName: 'ring-2 ring-green-500 ring-offset-2'
  },
  attention: {
    icon: AlertTriangle,
    label: 'Attention',
    className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    activeClassName: 'ring-2 ring-yellow-500 ring-offset-2'
  },
  bad: {
    icon: XCircle,
    label: 'Bad',
    className: 'bg-red-500 hover:bg-red-600 text-white',
    activeClassName: 'ring-2 ring-red-500 ring-offset-2'
  },
  na: {
    icon: MinusCircle,
    label: 'N/A',
    className: 'bg-gray-400 hover:bg-gray-500 text-white',
    activeClassName: 'ring-2 ring-gray-400 ring-offset-2'
  }
};

export function ForkliftInspectionItem({
  label,
  itemKey,
  value,
  notes,
  photos = [],
  previousStatus,
  onChange,
  onNotesChange,
  onPhotosChange,
  icon,
}: ForkliftInspectionItemProps) {
  const [isNotesOpen, setIsNotesOpen] = React.useState(!!notes || value === 'attention' || value === 'bad');

  // Auto-expand notes when status is attention or bad
  React.useEffect(() => {
    if (value === 'attention' || value === 'bad') {
      setIsNotesOpen(true);
    }
  }, [value]);

  const handlePhotosChange = (newPhotos: string[]) => {
    if (onPhotosChange) {
      onPhotosChange(itemKey, newPhotos);
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <span className="font-medium">{label}</span>
            {previousStatus && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-xs',
                  previousStatus === 'good' && 'border-green-500 text-green-600',
                  previousStatus === 'attention' && 'border-yellow-500 text-yellow-600',
                  previousStatus === 'bad' && 'border-red-500 text-red-600',
                  previousStatus === 'na' && 'border-gray-400 text-gray-600'
                )}
              >
                Last: {previousStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Status buttons */}
      <div className="flex gap-2">
        {(Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]).map(statusKey => {
          const config = STATUS_CONFIG[statusKey];
          const Icon = config.icon;
          const isActive = value === statusKey;

          return (
            <Button
              key={statusKey}
              type="button"
              size="sm"
              className={cn(
                'flex-1 transition-all',
                isActive ? config.className : 'bg-muted hover:bg-muted/80 text-foreground',
                isActive && config.activeClassName
              )}
              onClick={() => onChange(itemKey, isActive ? null : statusKey)}
            >
              <Icon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{config.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Notes & Photos section */}
      <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            <span className="text-sm text-muted-foreground">
              {notes || photos.length > 0 ? `Notes${photos.length > 0 ? ` & ${photos.length} photo(s)` : ''}` : 'Add notes/photos'}
            </span>
            {isNotesOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-3">
          <Textarea
            placeholder={`Add notes about ${label.toLowerCase()}...`}
            value={notes || ''}
            onChange={(e) => onNotesChange(itemKey, e.target.value)}
            rows={2}
          />
          {onPhotosChange && (
            <InspectionPhotoUpload
              photos={photos}
              onPhotosChange={handlePhotosChange}
              maxPhotos={3}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
