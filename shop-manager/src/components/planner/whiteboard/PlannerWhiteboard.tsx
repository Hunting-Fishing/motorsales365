import { useState, useRef, useCallback } from 'react';
import { usePlannerItems, usePlannerMutations } from '@/hooks/usePlannerData';
import { PlannerBoardItem } from '@/types/planner';
import { Button } from '@/components/ui/button';
import { StickyNote, ZoomIn, ZoomOut, Move, Hand, Users, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WhiteboardNote } from './WhiteboardNote';
import { WhiteboardResourceCard } from './WhiteboardResourceCard';

const NOTE_COLORS = [
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
  '#ffffff', // white
];

interface DroppedResource {
  type: 'staff' | 'equipment';
  id: string;
  name: string;
  job_title?: string;
  avatar_url?: string;
  initials?: string;
  equipment_type?: string;
  unit_number?: string;
  status?: string;
}

export function PlannerWhiteboard() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'select' | 'pan' | 'note'>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const { data: items } = usePlannerItems('whiteboard');
  const { createItem, updateItem, deleteItem } = usePlannerMutations();

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (tool !== 'note') {
      setSelectedId(null);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    createItem.mutate({
      board_type: 'whiteboard',
      item_type: 'note',
      title: 'New Note',
      content: '',
      position_x: x,
      position_y: y,
      width: 200,
      height: 150,
      color: selectedColor,
    });

    setTool('select');
  }, [tool, pan, zoom, createItem, selectedColor]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const jsonData = e.dataTransfer.getData('application/json');
    if (!jsonData) return;

    try {
      const resource: DroppedResource = JSON.parse(jsonData);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;

      // Create a resource card item
      createItem.mutate({
        board_type: 'whiteboard',
        item_type: 'assignment',
        title: resource.name,
        content: JSON.stringify({
          resourceType: resource.type,
          resourceId: resource.id,
          name: resource.name,
          subtitle: resource.type === 'staff' 
            ? resource.job_title 
            : `${resource.equipment_type}${resource.unit_number ? ` • ${resource.unit_number}` : ''}`,
          avatarUrl: resource.avatar_url,
          initials: resource.initials,
          status: resource.status,
        }),
        position_x: x,
        position_y: y,
        width: 220,
        height: 80,
        employee_id: resource.type === 'staff' ? resource.id : undefined,
        equipment_id: resource.type === 'equipment' ? resource.id : undefined,
        swimlane_resource_type: resource.type === 'staff' ? 'employee' : 'equipment',
      });
    } catch (err) {
      console.error('Failed to parse dropped resource:', err);
    }
  }, [pan, zoom, createItem]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleNoteUpdate = useCallback((id: string, updates: Partial<PlannerBoardItem>) => {
    updateItem.mutate({ id, ...updates });
  }, [updateItem]);

  const handleNoteDelete = useCallback((id: string) => {
    deleteItem.mutate(id);
    setSelectedId(null);
  }, [deleteItem]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan' || e.button === 1) { // Middle mouse button
      isPanning.current = true;
      lastPan.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPan.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(Math.max(prev + delta, 0.25), 2));
    }
  };

  // Parse resource data from item content
  const getResourceData = (item: PlannerBoardItem) => {
    try {
      const data = JSON.parse(item.content || '{}');
      return {
        type: data.resourceType as 'staff' | 'equipment',
        name: data.name || item.title || 'Unknown',
        subtitle: data.subtitle,
        avatarUrl: data.avatarUrl,
        initials: data.initials,
        status: data.status,
      };
    } catch {
      return {
        type: 'staff' as const,
        name: item.title || 'Unknown',
      };
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          {/* Tool Selection */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-card">
            <Button
              variant={tool === 'select' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTool('select')}
              className="h-8 w-8 p-0"
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'pan' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTool('pan')}
              className="h-8 w-8 p-0"
            >
              <Hand className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'note' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTool('note')}
              className="h-8 w-8 p-0"
            >
              <StickyNote className="h-4 w-4" />
            </Button>
          </div>

          {/* Color Picker */}
          {tool === 'note' && (
            <div className="flex items-center gap-1 ml-4">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    selectedColor === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          )}

          {/* Resource hint */}
          <div className="flex items-center gap-2 ml-4 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <Wrench className="h-3.5 w-3.5" />
            <span>Drag resources from sidebar</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((prev) => Math.min(prev + 0.1, 2))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-hidden relative transition-colors',
          tool === 'pan' && 'cursor-grab active:cursor-grabbing',
          tool === 'note' && 'cursor-crosshair',
          isDragOver && 'bg-primary/5 ring-2 ring-inset ring-primary/30'
        )}
        style={{
          backgroundImage: `
            radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Drop indicator */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-primary/10 border-2 border-dashed border-primary rounded-lg px-6 py-4">
              <p className="text-primary font-medium">Drop to add resource</p>
            </div>
          </div>
        )}

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {items?.map((item) => {
            if (item.item_type === 'assignment') {
              const resourceData = getResourceData(item);
              return (
                <WhiteboardResourceCard
                  key={item.id}
                  item={item}
                  resourceData={resourceData}
                  isSelected={selectedId === item.id}
                  onSelect={() => setSelectedId(item.id)}
                  onUpdate={handleNoteUpdate}
                  onDelete={handleNoteDelete}
                  zoom={zoom}
                />
              );
            }
            return (
              <WhiteboardNote
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onSelect={() => setSelectedId(item.id)}
                onUpdate={handleNoteUpdate}
                onDelete={handleNoteDelete}
                zoom={zoom}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {(!items || items.length === 0) && !isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">Empty Whiteboard</p>
              <p className="text-sm">Add notes or drag Staff/Equipment from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
