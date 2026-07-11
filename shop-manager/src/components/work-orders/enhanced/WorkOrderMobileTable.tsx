import React from 'react';
import { Link } from 'react-router-dom';
import { WorkOrder } from '@/types/workOrder';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkOrderStatusBadge } from '../WorkOrderStatusBadge';
import { Calendar, User, Car, DollarSign, Clock, Eye, Phone, MessageSquare } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';

interface WorkOrderMobileTableProps {
  workOrders: WorkOrder[];
  onStatusChange?: (id: string, status: string) => void;
  onBulkSelect?: (selectedIds: string[]) => void;
  enableSwipeActions?: boolean;
}

export function WorkOrderMobileTable({ 
  workOrders, 
  onStatusChange,
  onBulkSelect,
  enableSwipeActions = true
}: WorkOrderMobileTableProps) {
  const { isMobile } = useResponsive();
  const [selectedItems, setSelectedItems] = React.useState<Set<string>>(new Set());
  const [swipeStates, setSwipeStates] = React.useState<Map<string, { x: number; swiping: boolean }>>(new Map());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSwipeStart = (id: string, e: React.TouchEvent) => {
    if (!enableSwipeActions) return;
    
    const touch = e.touches[0];
    setSwipeStates(prev => new Map(prev.set(id, { x: touch.clientX, swiping: true })));
  };

  const handleSwipeMove = (id: string, e: React.TouchEvent) => {
    if (!enableSwipeActions) return;
    
    const swipeState = swipeStates.get(id);
    if (!swipeState?.swiping) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.x;
    
    // Update position for visual feedback
    const element = e.currentTarget as HTMLElement;
    element.style.transform = `translateX(${Math.max(-80, Math.min(80, deltaX))}px)`;
  };

  const handleSwipeEnd = (id: string, e: React.TouchEvent) => {
    if (!enableSwipeActions) return;
    
    const swipeState = swipeStates.get(id);
    if (!swipeState?.swiping) return;

    const element = e.currentTarget as HTMLElement;
    element.style.transform = 'translateX(0)';
    
    setSwipeStates(prev => new Map(prev.set(id, { ...swipeState, swiping: false })));
  };

  const handleLongPress = (id: string) => {
    if (selectedItems.has(id)) {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } else {
      setSelectedItems(prev => new Set(prev.add(id)));
    }
  };

  React.useEffect(() => {
    if (onBulkSelect) {
      onBulkSelect(Array.from(selectedItems));
    }
  }, [selectedItems, onBulkSelect]);

  if (!isMobile) {
    return null; // Use regular table for desktop
  }

  return (
    <div className="space-y-3">
      {/* Selection Header */}
      {selectedItems.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary">
                {selectedItems.size} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Update Status
                </Button>
                <Button size="sm" variant="outline">
                  Assign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Orders List */}
      {workOrders.map((workOrder, index) => {
        const isSelected = selectedItems.has(workOrder.id);
        
        return (
          <Card 
            key={workOrder.id}
            className={`
              transition-all duration-200 
              ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}
              ${enableSwipeActions ? 'touch-pan-y' : ''}
            `}
            style={{ animationDelay: `${index * 50}ms` }}
            onTouchStart={(e) => handleSwipeStart(workOrder.id, e)}
            onTouchMove={(e) => handleSwipeMove(workOrder.id, e)}
            onTouchEnd={(e) => handleSwipeEnd(workOrder.id, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleLongPress(workOrder.id);
            }}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {workOrder.work_order_number || `WO-${workOrder.id.slice(0, 8)}`}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {workOrder.description || 'No description provided'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <WorkOrderStatusBadge status={workOrder.status} />
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs text-white">✓</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {workOrder.customer_name && (
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{workOrder.customer_name}</span>
                    </div>
                  )}

                  {workOrder.created_at && (
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{formatDate(workOrder.created_at)}</span>
                    </div>
                  )}

                  {(workOrder.vehicle_make && workOrder.vehicle_model) && (
                    <div className="flex items-center gap-2 min-w-0 col-span-2">
                      <Car className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">
                        {workOrder.vehicle_year} {workOrder.vehicle_make} {workOrder.vehicle_model}
                      </span>
                    </div>
                  )}

                  {workOrder.total_cost && (
                    <div className="flex items-center gap-2 min-w-0">
                      <DollarSign className="w-3 h-3 text-success flex-shrink-0" />
                      <span className="font-medium text-success">
                        ${workOrder.total_cost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="h-8 px-2">
                      <Phone className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2">
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <Button 
                    asChild
                    size="sm"
                    variant="default"
                    className="h-8"
                  >
                    <Link to={`/work-orders/${workOrder.id}`}>
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>

            {/* Swipe Actions Indicator */}
            {enableSwipeActions && (
              <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-primary/20 to-transparent flex items-center justify-center opacity-0 transition-opacity duration-200 pointer-events-none">
                <div className="text-xs text-primary font-medium">Actions</div>
              </div>
            )}
          </Card>
        );
      })}

      {workOrders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No work orders found</h3>
            <p className="text-muted-foreground">
              Create your first work order to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}