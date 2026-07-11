import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, MapPin } from 'lucide-react';

interface ClickableErrorItemProps {
  error: {
    field: string;
    message: string;
    tab: string;
    tabValue: string;
    fieldId: string;
  };
  onNavigate: (tabValue: string, fieldId: string) => void;
}

export function ClickableErrorItem({ error, onNavigate }: ClickableErrorItemProps) {
  const handleClick = () => {
    onNavigate(error.tabValue, error.fieldId);
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start p-3 h-auto text-left hover:bg-destructive/5 border border-destructive/20 rounded-lg group transition-all duration-200"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-2 h-2 bg-destructive rounded-full"></div>
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="text-sm font-medium text-destructive">
            {error.message}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{error.tab} → {error.field}</span>
          </div>
        </div>
        
        <ChevronRight className="h-4 w-4 text-destructive/60 group-hover:text-destructive transition-colors" />
      </div>
    </Button>
  );
}