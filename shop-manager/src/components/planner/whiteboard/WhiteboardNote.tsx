import { useState, useRef, useEffect } from 'react';
import { PlannerBoardItem } from '@/types/planner';
import { cn } from '@/lib/utils';
import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface WhiteboardNoteProps {
  item: PlannerBoardItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<PlannerBoardItem>) => void;
  onDelete: (id: string) => void;
  zoom: number;
}

export function WhiteboardNote({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  zoom,
}: WhiteboardNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(item.content || '');
  const noteRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setLocalContent(item.content || '');
  }, [item.content]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - (item.position_x || 0) * zoom,
      y: e.clientY - (item.position_y || 0) * zoom,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const x = (e.clientX - dragStart.current.x) / zoom;
    const y = (e.clientY - dragStart.current.y) / zoom;
    onUpdate(item.id, { position_x: x, position_y: y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localContent !== item.content) {
      onUpdate(item.id, { content: localContent });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalContent(item.content || '');
    }
  };

  return (
    <div
      ref={noteRef}
      className={cn(
        'absolute rounded-lg shadow-md cursor-move select-none',
        'transition-shadow duration-200',
        isSelected && 'ring-2 ring-primary shadow-lg',
        isDragging && 'opacity-80 shadow-xl'
      )}
      style={{
        left: item.position_x || 0,
        top: item.position_y || 0,
        width: item.width || 200,
        minHeight: item.height || 150,
        backgroundColor: item.color || '#fef08a',
        zIndex: isSelected ? 100 : item.z_index || 1,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-black/10">
        <GripVertical className="h-4 w-4 text-black/30" />
        {isSelected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-black/50 hover:text-red-500 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-2">
        {isEditing ? (
          <Textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full min-h-[100px] bg-transparent border-none resize-none focus:ring-0 p-0 text-sm text-black/80"
            placeholder="Type your note..."
          />
        ) : (
          <p className="text-sm text-black/80 whitespace-pre-wrap min-h-[100px]">
            {item.content || (
              <span className="text-black/40 italic">Double-click to edit...</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
