import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlannerBoardColumn, PlannerBoardItem } from '@/types/planner';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  column: PlannerBoardColumn;
  items: PlannerBoardItem[];
  compact?: boolean;
}

export function KanbanColumn({ column, items, compact }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.column_key,
  });

  const hasWipLimit = column.wip_limit && column.wip_limit > 0;
  const isOverWipLimit = hasWipLimit && items.length > column.wip_limit!;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg bg-muted/40 border border-border',
        compact ? 'w-[280px] min-h-[120px]' : 'w-[320px] min-h-[400px]',
        isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b border-border rounded-t-lg',
          isOverWipLimit && 'bg-destructive/10'
        )}
        style={{ borderLeftColor: column.color, borderLeftWidth: 3 }}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{column.column_name}</span>
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              isOverWipLimit
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {items.length}
            {hasWipLimit && `/${column.wip_limit}`}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Column Content */}
      <ScrollArea className={cn('flex-1', compact ? 'max-h-[200px]' : 'max-h-[calc(100vh-280px)]')}>
        <div className="p-2 space-y-2">
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <KanbanCard key={item.id} item={item} />
            ))}
          </SortableContext>

          {items.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Drop items here
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
