import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlannerBoardItem } from '@/types/planner';
import { cn } from '@/lib/utils';
import { GripVertical, Clock, User, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface KanbanCardProps {
  item: PlannerBoardItem;
  isDragging?: boolean;
}

export function KanbanCard({ item, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    low: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    urgent: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const typeIcons = {
    work_order: Wrench,
    task: CheckCircle2,
    note: AlertCircle,
    assignment: User,
    milestone: AlertCircle,
  };

  const TypeIcon = typeIcons[item.item_type] || CheckCircle2;
  const customerName = item.work_order?.customer
    ? item.work_order.customer.company_name ||
      `${item.work_order.customer.first_name || ''} ${item.work_order.customer.last_name || ''}`.trim()
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-card border border-border rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing',
        'hover:shadow-md hover:border-primary/30 transition-all duration-200',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2',
        item.item_type === 'work_order' && 'border-l-4 border-l-primary'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{item.title}</span>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
      </div>

      {/* Content */}
      {item.content && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.content}</p>
      )}

      {/* Customer */}
      {customerName && (
        <p className="text-xs text-muted-foreground mb-2 truncate">
          <span className="text-foreground/70">Customer:</span> {customerName}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          {/* Priority Badge */}
          {item.priority && (
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1.5 py-0', priorityColors[item.priority])}
            >
              {item.priority}
            </Badge>
          )}

          {/* Duration */}
          {item.duration_hours && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {item.duration_hours}h
            </div>
          )}
        </div>

        {/* Assignee */}
        {item.employee && (
          <Avatar className="h-5 w-5">
            <AvatarImage src={item.employee.avatar_url} />
            <AvatarFallback className="text-[8px]">
              {(item.employee.first_name?.[0] || '') + (item.employee.last_name?.[0] || '')}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Date */}
      {item.start_date && (
        <div className="text-[10px] text-muted-foreground mt-1">
          {format(new Date(item.start_date), 'MMM d, h:mm a')}
        </div>
      )}
    </div>
  );
}
