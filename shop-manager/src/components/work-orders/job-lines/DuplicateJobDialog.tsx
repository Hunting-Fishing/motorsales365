import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DuplicateMatch } from '@/lib/services/duplicateDetectionService';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface DuplicateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: DuplicateMatch[];
  proposedJobName: string;
  onSelectDuplicate: (duplicate: DuplicateMatch) => void;
  onCreateNew: () => void;
}

export function DuplicateJobDialog({
  open,
  onOpenChange,
  duplicates,
  proposedJobName,
  onSelectDuplicate,
  onCreateNew
}: DuplicateJobDialogProps) {
  const getMatchTypeColor = (matchType: 'exact' | 'high' | 'medium') => {
    switch (matchType) {
      case 'exact':
        return 'bg-destructive/10 text-destructive';
      case 'high':
        return 'bg-warning/10 text-warning';
      case 'medium':
        return 'bg-info/10 text-info';
    }
  };

  const getMatchTypeIcon = (matchType: 'exact' | 'high' | 'medium') => {
    switch (matchType) {
      case 'exact':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <Info className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
    }
  };

  const getMatchTypeLabel = (matchType: 'exact' | 'high' | 'medium') => {
    switch (matchType) {
      case 'exact':
        return 'Exact Match';
      case 'high':
        return 'High Similarity';
      case 'medium':
        return 'Similar';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Similar Job Lines Found
          </DialogTitle>
          <DialogDescription>
            We found {duplicates.length} similar job line{duplicates.length !== 1 ? 's' : ''} for "{proposedJobName}". 
            Would you like to use an existing one or create a new job line?
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {duplicates.map((duplicate, index) => (
              <div
                key={duplicate.job.id || index}
                className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => onSelectDuplicate(duplicate)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{duplicate.job.name}</h4>
                      <Badge 
                        variant="outline" 
                        className={getMatchTypeColor(duplicate.matchType)}
                      >
                        {getMatchTypeIcon(duplicate.matchType)}
                        <span className="ml-1">{getMatchTypeLabel(duplicate.matchType)}</span>
                      </Badge>
                    </div>
                    
                    {duplicate.job.description && (
                      <p className="text-sm text-muted-foreground">
                        {duplicate.job.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        <strong>Sector:</strong> {duplicate.sectorName}
                      </span>
                      <span>
                        <strong>Category:</strong> {duplicate.categoryName}
                      </span>
                      <span>
                        <strong>Subcategory:</strong> {duplicate.subcategoryName}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      {duplicate.job.estimatedTime && (
                        <span className="text-muted-foreground">
                          ⏱ {duplicate.job.estimatedTime} min
                        </span>
                      )}
                      {duplicate.job.price && (
                        <span className="text-muted-foreground">
                          💰 ${duplicate.job.price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-muted-foreground ml-auto">
                        {Math.round(duplicate.similarityScore * 100)}% match
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDuplicate(duplicate);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Use This
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onCreateNew}
          >
            Create New Job Line
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
