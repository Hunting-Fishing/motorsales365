import { useState, useRef, useEffect } from 'react';
import { PlannerBoardItem } from '@/types/planner';
import { cn } from '@/lib/utils';
import { Trash2, GripVertical, User, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ResourceData {
  type: 'staff' | 'equipment';
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  initials?: string;
  status?: string;
}

interface WhiteboardResourceCardProps {
  item: PlannerBoardItem;
  resourceData: ResourceData;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<PlannerBoardItem>) => void;
  onDelete: (id: string) => void;
  zoom: number;
}

export function WhiteboardResourceCard({
  item,
  resourceData,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  zoom,
}: WhiteboardResourceCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
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

  const isStaff = resourceData.type === 'staff';
  const bgColor = isStaff ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--secondary))';
  const borderColor = isStaff ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))';

  return (
    <div
      ref={cardRef}
      className={cn(
        'absolute rounded-lg shadow-md cursor-move select-none border-2',
        'transition-shadow duration-200',
        isSelected && 'ring-2 ring-primary shadow-lg',
        isDragging && 'opacity-80 shadow-xl'
      )}
      style={{
        left: item.position_x || 0,
        top: item.position_y || 0,
        width: item.width || 220,
        backgroundColor: bgColor,
        borderColor: borderColor,
        zIndex: isSelected ? 100 : item.z_index || 1,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-2 py-1.5 border-b"
        style={{ borderColor: borderColor }}
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <Badge variant={isStaff ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
            {isStaff ? 'Staff' : 'Equipment'}
          </Badge>
        </div>
        {isSelected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
      <div className="p-3 flex items-center gap-3">
        {isStaff ? (
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={resourceData.avatarUrl} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {resourceData.initials || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <Wrench className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {resourceData.name}
          </p>
          {resourceData.subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {resourceData.subtitle}
            </p>
          )}
          {resourceData.status && (
            <Badge variant="outline" className="text-[10px] mt-1">
              {resourceData.status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
