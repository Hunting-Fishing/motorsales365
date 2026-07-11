import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/types/calendar";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, User, AlertCircle, Plus, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { priorityMap } from "@/utils/workOrders";

interface CalendarDayDetailDialogProps {
  date: Date | null;
  events: CalendarEvent[];
  carryOverEvents?: CalendarEvent[];
  isOpen: boolean;
  onClose: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onAddTask?: (date: Date) => void;
}

export function CalendarDayDetailDialog({
  date,
  events,
  carryOverEvents = [],
  isOpen,
  onClose,
  onEventClick,
  onAddTask
}: CalendarDayDetailDialogProps) {
  if (!date) return null;

  // Separate tasks from other events
  const tasks = events.filter(e => e.type === 'task' || e.event_type === 'task');
  const jobs = events.filter(e => e.type !== 'task' && e.event_type !== 'task');

  const sortedEvents = [...events].sort((a, b) => {
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  const sortedCarryOverEvents = [...carryOverEvents].sort((a, b) => {
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });

  const renderEventCard = (event: CalendarEvent, isCarryOver = false) => (
    <div
      key={event.id}
      onClick={() => {
        onEventClick(event);
        onClose();
      }}
      className={cn(
        "p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md",
        priorityMap[event.priority]?.classes || "border-l-gray-300 bg-gray-50"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{event.title}</h3>
            {isCarryOver && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800 font-medium">
                <AlertCircle className="h-3 w-3" />
                Overdue
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {isCarryOver && `${format(new Date(event.start), "MMM d")} - `}
                {format(new Date(event.start), "h:mm a")} - {format(new Date(event.end), "h:mm a")}
              </span>
            </div>
            
            {event.technician && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{event.technician}</span>
              </div>
            )}
            
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {event.customer && (
            <div className="text-sm">
              <span className="font-medium">Customer:</span> {event.customer}
            </div>
          )}

          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {event.status && (
            <span className={cn(
              "px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap",
              event.status === "completed" && "bg-green-100 text-green-800",
              event.status === "in-progress" && "bg-blue-100 text-blue-800",
              event.status === "scheduled" && "bg-yellow-100 text-yellow-800",
              event.status === "cancelled" && "bg-red-100 text-red-800"
            )}>
              {event.status}
            </span>
          )}
          
          {event.type && (
            <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-800 font-medium whitespace-nowrap">
              {event.type}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(date, "EEEE, MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2">
              {jobs.length > 0 && (
                <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-semibold rounded-full bg-primary/10 text-primary">
                  {jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'}
                </span>
              )}
              {tasks.length > 0 && (
                <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-semibold rounded-full bg-purple-100 text-purple-800">
                  {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
                </span>
              )}
              {carryOverEvents.length > 0 && (
                <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-semibold rounded-full bg-orange-100 text-orange-800">
                  {carryOverEvents.length} Overdue
                </span>
              )}
              {onAddTask && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onAddTask(date)}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              Jobs ({jobs.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="relative">
              Tasks ({tasks.length})
              {tasks.length > 0 && (
                <CheckSquare className="ml-1 h-3 w-3" />
              )}
            </TabsTrigger>
            <TabsTrigger value="carryover" className="relative">
              Overdue ({carryOverEvents.length})
              {carryOverEvents.length > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="flex-1 overflow-y-auto space-y-3 pr-2 mt-4">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs scheduled for this day
              </div>
            ) : (
              jobs.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map((event) => renderEventCard(event))
            )}
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 overflow-y-auto space-y-3 pr-2 mt-4">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                <p className="font-medium">No tasks for this day</p>
                {onAddTask && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => onAddTask(date)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add a task
                  </Button>
                )}
              </div>
            ) : (
              tasks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).map((event) => renderEventCard(event))
            )}
          </TabsContent>
          
          <TabsContent value="carryover" className="flex-1 overflow-y-auto space-y-3 pr-2 mt-4">
            {sortedCarryOverEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p className="font-medium">No overdue jobs</p>
                <p className="text-sm mt-1">All past jobs have been completed</p>
              </div>
            ) : (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm text-orange-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">
                      These jobs were scheduled for past dates and are not yet completed
                    </span>
                  </div>
                </div>
                {sortedCarryOverEvents.map((event) => renderEventCard(event, true))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
