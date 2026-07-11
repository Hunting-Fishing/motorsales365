import { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
import { useStaffForPlanner, useWorkOrdersForPlanner, useEquipmentForPlanner } from '@/hooks/usePlannerData';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Users, Ship, Wrench, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SwimlaneResourceType } from '@/types/planner';

type ZoomLevel = 'day' | 'week' | 'month';

export function ResourceTimeline() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [resourceType, setResourceType] = useState<SwimlaneResourceType>('employee');

  const { data: staff } = useStaffForPlanner();
  const { data: workOrders } = useWorkOrdersForPlanner();
  const { data: equipment } = useEquipmentForPlanner();

  // Calculate date range based on zoom level
  const dateRange = useMemo(() => {
    if (zoomLevel === 'day') {
      return eachDayOfInterval({
        start: currentDate,
        end: addDays(currentDate, 0),
      });
    } else if (zoomLevel === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      });
    } else {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 27),
      });
    }
  }, [currentDate, zoomLevel]);

  // Get resources based on type
  const resources = useMemo(() => {
    if (resourceType === 'employee') {
      return (staff || []).map((s) => ({
        id: s.id,
        name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || 'Unknown',
        avatar: s.avatar_url || undefined,
        subtitle: s.job_title || undefined,
      }));
    } else if (resourceType === 'equipment') {
      return (equipment || []).map((e) => ({
        id: e.id,
        name: e.name,
        avatar: undefined,
        subtitle: e.equipment_type || undefined,
      }));
    }
    return [];
  }, [resourceType, staff, equipment]);

  // Get tasks for each resource
  const getResourceTasks = (resourceId: string) => {
    return (workOrders || [])
      .filter((wo) => {
        if (resourceType === 'employee') {
          return wo.technician_id === resourceId;
        }
        return false;
      })
      .map((wo) => ({
        id: wo.id,
        title: wo.title,
        startDate: wo.start_time ? new Date(wo.start_time) : null,
        endDate: wo.end_time ? new Date(wo.end_time) : null,
        status: wo.status,
        priority: wo.priority,
      }))
      .filter((t) => t.startDate);
  };

  const navigate = (direction: 'prev' | 'next') => {
    const amount = zoomLevel === 'day' ? 1 : zoomLevel === 'week' ? 7 : 28;
    setCurrentDate((prev) =>
      direction === 'prev' ? addDays(prev, -amount) : addDays(prev, amount)
    );
  };

  const columnWidth = zoomLevel === 'day' ? 200 : zoomLevel === 'week' ? 120 : 40;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          {/* Resource Type Selector */}
          <div className="flex items-center gap-1 mr-4">
            <Button
              variant={resourceType === 'employee' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setResourceType('employee')}
            >
              <Users className="h-4 w-4 mr-1" />
              Staff
            </Button>
            <Button
              variant={resourceType === 'equipment' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setResourceType('equipment')}
            >
              <Wrench className="h-4 w-4 mr-1" />
              Equipment
            </Button>
          </div>

          {/* Navigation */}
          <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="text-sm font-medium ml-2">
            {format(dateRange[0], 'MMM d')} - {format(dateRange[dateRange.length - 1], 'MMM d, yyyy')}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Zoom:</span>
          {(['day', 'week', 'month'] as ZoomLevel[]).map((level) => (
            <Button
              key={level}
              variant={zoomLevel === level ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setZoomLevel(level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex">
            {/* Resource Names Column */}
            <div className="sticky left-0 z-10 bg-card border-r border-border w-[200px] shrink-0">
              {/* Header */}
              <div className="h-12 border-b border-border px-3 flex items-center font-medium text-sm bg-muted/30">
                Resources
              </div>
              
              {/* Resource Rows */}
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className="h-16 border-b border-border px-3 flex items-center gap-2"
                >
                  {resource.avatar ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={resource.avatar} />
                      <AvatarFallback>{resource.name[0]}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      {resourceType === 'employee' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        <Wrench className="h-4 w-4" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{resource.name}</div>
                    {resource.subtitle && (
                      <div className="text-xs text-muted-foreground truncate">
                        {resource.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline Grid */}
            <div className="flex-1">
              {/* Date Headers */}
              <div className="flex h-12 border-b border-border bg-muted/30 sticky top-0 z-5">
                {dateRange.map((date) => (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      'shrink-0 border-r border-border px-2 flex flex-col items-center justify-center',
                      isSameDay(date, new Date()) && 'bg-primary/10'
                    )}
                    style={{ width: columnWidth }}
                  >
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {format(date, 'EEE')}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isSameDay(date, new Date()) && 'text-primary'
                      )}
                    >
                      {format(date, zoomLevel === 'month' ? 'd' : 'd MMM')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Resource Rows with Tasks */}
              {resources.map((resource) => {
                const tasks = getResourceTasks(resource.id);

                return (
                  <div key={resource.id} className="flex h-16 border-b border-border relative">
                    {/* Grid cells */}
                    {dateRange.map((date) => (
                      <div
                        key={date.toISOString()}
                        className={cn(
                          'shrink-0 border-r border-border',
                          isSameDay(date, new Date()) && 'bg-primary/5'
                        )}
                        style={{ width: columnWidth }}
                      />
                    ))}

                    {/* Tasks overlay */}
                    <TooltipProvider>
                      {tasks.map((task) => {
                        if (!task.startDate) return null;
                        
                        const startIdx = dateRange.findIndex((d) =>
                          isSameDay(d, task.startDate!)
                        );
                        if (startIdx === -1) return null;

                        const endDate = task.endDate || task.startDate;
                        const endIdx = dateRange.findIndex((d) => isSameDay(d, endDate));
                        const span = Math.max(1, (endIdx === -1 ? dateRange.length : endIdx) - startIdx + 1);

                        const priorityColors = {
                          urgent: 'bg-red-500',
                          high: 'bg-amber-500',
                          medium: 'bg-blue-500',
                          low: 'bg-slate-400',
                        };

                        return (
                          <Tooltip key={task.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'absolute top-2 h-12 rounded-md px-2 py-1 cursor-pointer',
                                  'flex items-center overflow-hidden',
                                  'shadow-sm hover:shadow-md transition-shadow',
                                  priorityColors[task.priority as keyof typeof priorityColors] || 'bg-primary'
                                )}
                                style={{
                                  left: startIdx * columnWidth + 4,
                                  width: span * columnWidth - 8,
                                }}
                              >
                                <span className="text-xs text-white font-medium truncate">
                                  {task.title}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="font-medium">{task.title}</p>
                                <p className="text-xs">
                                  {format(task.startDate!, 'MMM d, h:mm a')}
                                  {task.endDate && ` - ${format(task.endDate, 'h:mm a')}`}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </TooltipProvider>
                  </div>
                );
              })}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}
