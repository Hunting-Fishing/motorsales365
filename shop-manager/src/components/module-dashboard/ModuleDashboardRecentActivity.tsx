import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  meta?: string;
  onClick?: () => void;
}

interface ActivityPanel {
  title: string;
  items: ActivityItem[];
  isLoading?: boolean;
  emptyIcon: LucideIcon;
  emptyMessage: string;
  emptyActionLabel?: string;
  emptyActionOnClick?: () => void;
  viewAllLabel?: string;
  viewAllOnClick?: () => void;
}

interface ModuleDashboardRecentActivityProps {
  leftPanel: ActivityPanel;
  rightPanel: ActivityPanel;
}

function ActivityPanelComponent({ panel }: { panel: ActivityPanel }) {
  const { title, items, isLoading, emptyIcon: EmptyIcon, emptyMessage, emptyActionLabel, emptyActionOnClick, viewAllLabel, viewAllOnClick } = panel;

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {viewAllOnClick && (
          <Button variant="ghost" size="sm" onClick={viewAllOnClick}>
            {viewAllLabel || 'View All'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                onClick={item.onClick}
              >
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <div className="text-right">
                  {item.badge && (
                    <Badge variant={item.badge.variant || 'outline'}>
                      {item.badge.text}
                    </Badge>
                  )}
                  {item.meta && (
                    <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <EmptyIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{emptyMessage}</p>
            {emptyActionLabel && emptyActionOnClick && (
              <Button variant="link" onClick={emptyActionOnClick}>
                {emptyActionLabel}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ModuleDashboardRecentActivity({ leftPanel, rightPanel }: ModuleDashboardRecentActivityProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ActivityPanelComponent panel={leftPanel} />
      <ActivityPanelComponent panel={rightPanel} />
    </div>
  );
}
