import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { usePlannerColumns, usePlannerItems, useStaffForPlanner, usePlannerMutations, useWorkOrdersForPlanner } from '@/hooks/usePlannerData';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanFilters } from './KanbanFilters';
import { PlannerBoardItem, SwimlaneResourceType } from '@/types/planner';
import { Loader2, Users, Ship, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PlannerKanbanBoard() {
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneResourceType | 'none'>('none');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ priority: '', status: '', search: '' });
  
  const { data: columns, isLoading: columnsLoading } = usePlannerColumns();
  const { data: items, isLoading: itemsLoading } = usePlannerItems('kanban');
  const { data: workOrders } = useWorkOrdersForPlanner();
  const { data: staff } = useStaffForPlanner();
  const { moveItem, createItem } = usePlannerMutations();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Combine planner items with work orders
  const allItems = useMemo(() => {
    const plannerItems = items || [];
    
    // Convert work orders to planner items format
    const workOrderItems: PlannerBoardItem[] = (workOrders || []).map((wo) => ({
      id: `wo-${wo.id}`,
      shop_id: '',
      board_type: 'kanban' as const,
      item_type: 'work_order' as const,
      title: wo.title || 'Untitled Work Order',
      work_order_id: wo.id,
      employee_id: wo.technician_id || undefined,
      priority: wo.priority as any,
      status: wo.status as any,
      column_id: mapStatusToColumn(wo.status),
      start_date: wo.start_time || undefined,
      end_date: wo.end_time || undefined,
      duration_hours: wo.estimated_hours || undefined,
      work_order: {
        id: wo.id,
        title: wo.title,
        status: wo.status,
      },
    }));

    return [...plannerItems, ...workOrderItems];
  }, [items, workOrders]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (filters.priority && item.priority !== filters.priority) return false;
      if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allItems, filters]);

  // Group by swimlane if enabled
  const swimlanes = useMemo(() => {
    if (swimlaneMode === 'none') return null;
    
    if (swimlaneMode === 'employee') {
      const lanes: { [key: string]: { name: string; avatar?: string; items: PlannerBoardItem[] } } = {
        unassigned: { name: 'Unassigned', items: [] },
      };
      
      staff?.forEach((s) => {
        lanes[s.id] = {
          name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || 'Unknown',
          avatar: s.avatar_url,
          items: [],
        };
      });
      
      filteredItems.forEach((item) => {
        const laneId = item.employee_id || 'unassigned';
        if (lanes[laneId]) {
          lanes[laneId].items.push(item);
        } else {
          lanes.unassigned.items.push(item);
        }
      });
      
      return lanes;
    }
    
    return null;
  }, [swimlaneMode, filteredItems, staff]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const itemId = active.id as string;
    const newColumnId = over.id as string;

    // Don't do anything if dropped in same column
    const item = allItems.find((i) => i.id === itemId);
    if (item?.column_id === newColumnId) return;

    // If it's a work order, we'd update the work order status
    // For now, update planner items only
    if (!itemId.startsWith('wo-')) {
      moveItem.mutate({ id: itemId, column_id: newColumnId });
    }
  };

  const activeItem = activeId ? allItems.find((i) => i.id === activeId) : null;

  if (columnsLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
        <KanbanFilters filters={filters} onFiltersChange={setFilters} />
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Group by:</span>
          <Button
            variant={swimlaneMode === 'none' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSwimlaneMode('none')}
          >
            None
          </Button>
          <Button
            variant={swimlaneMode === 'employee' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSwimlaneMode('employee')}
          >
            <Users className="h-4 w-4 mr-1" />
            Staff
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {swimlaneMode === 'none' ? (
            <div className="flex gap-4 h-full min-w-max">
              {columns?.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  items={filteredItems.filter((i) => i.column_id === column.column_key)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {swimlanes &&
                Object.entries(swimlanes).map(([laneId, lane]) => (
                  <div key={laneId} className="space-y-2">
                    <div className="flex items-center gap-2 px-2">
                      {lane.avatar ? (
                        <img
                          src={lane.avatar}
                          alt={lane.name}
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-3 w-3" />
                        </div>
                      )}
                      <span className="font-medium text-sm">{lane.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({lane.items.length})
                      </span>
                    </div>
                    <div className="flex gap-4 min-w-max">
                      {columns?.map((column) => (
                        <KanbanColumn
                          key={`${laneId}-${column.id}`}
                          column={column}
                          items={lane.items.filter((i) => i.column_id === column.column_key)}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          <DragOverlay>
            {activeItem && <KanbanCard item={activeItem} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function mapStatusToColumn(status?: string): string {
  switch (status) {
    case 'pending':
    case 'scheduled':
      return 'todo';
    case 'in_progress':
      return 'in_progress';
    case 'waiting_parts':
    case 'waiting_approval':
      return 'review';
    case 'completed':
      return 'done';
    default:
      return 'backlog';
  }
}
