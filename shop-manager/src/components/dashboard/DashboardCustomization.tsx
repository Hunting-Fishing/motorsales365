import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDashboardPreferences, DashboardWidget } from '@/hooks/useDashboardPreferences';
import { Settings2, GripVertical, Monitor, Layers, PieChart } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface DashboardCustomizationProps {
  onClose: () => void;
}

export function DashboardCustomization({ onClose }: DashboardCustomizationProps) {
  const {
    preferences,
    isLoading,
    savePreferences,
    toggleWidget,
    reorderWidgets,
  } = useDashboardPreferences();

  const handleLayoutChange = (layout: string) => {
    savePreferences({ layout: layout as 'compact' | 'detailed' | 'executive' });
  };

  const handleRefreshIntervalChange = (interval: string) => {
    savePreferences({ refreshInterval: parseInt(interval) });
  };

  const handleDefaultViewChange = (view: string) => {
    savePreferences({ defaultView: view as 'default' | 'nonprofit' });
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(preferences.widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderWidgets(items);
  };

  const getLayoutIcon = (layout: string) => {
    switch (layout) {
      case 'compact':
        return <Monitor className="h-4 w-4" />;
      case 'detailed':
        return <Layers className="h-4 w-4" />;
      case 'executive':
        return <PieChart className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Dashboard Customization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Dashboard Customization
        </CardTitle>
        <CardDescription>
          Personalize your dashboard layout, widgets, and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Layout Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Dashboard Layout</Label>
          <Select value={preferences.layout} onValueChange={handleLayoutChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Compact - Dense information layout
                </div>
              </SelectItem>
              <SelectItem value="detailed">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Detailed - Standard layout with full widgets
                </div>
              </SelectItem>
              <SelectItem value="executive">
                <div className="flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Executive - High-level summary view
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Default View */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Default View</Label>
          <Select value={preferences.defaultView} onValueChange={handleDefaultViewChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Standard Dashboard</SelectItem>
              <SelectItem value="nonprofit">Nonprofit Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Refresh Interval */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Auto-refresh Interval</Label>
          <Select 
            value={preferences.refreshInterval.toString()} 
            onValueChange={handleRefreshIntervalChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
              <SelectItem value="0">Manual only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Widget Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Dashboard Widgets</Label>
            <Badge variant="secondary">
              {preferences.widgets.filter(w => w.enabled).length} of {preferences.widgets.length} enabled
            </Badge>
          </div>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="widgets">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {preferences.widgets.map((widget, index) => (
                    <Draggable key={widget.id} draggableId={widget.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            snapshot.isDragging ? 'bg-accent' : 'bg-card'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{widget.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Position {widget.position + 1}
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={widget.enabled}
                            onCheckedChange={() => toggleWidget(widget.id)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}