
import { format, addMonths, addWeeks, addDays, subMonths, subWeeks, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CalendarViewType } from "@/types/calendar";

interface CalendarHeaderProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  view: CalendarViewType;
  setView: (view: CalendarViewType) => void;
  onAddTask?: () => void;
}

export function CalendarHeader({ 
  currentDate, 
  setCurrentDate, 
  view, 
  setView,
  onAddTask
}: CalendarHeaderProps) {
  const navigatePrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Service Calendar</h1>
        <p className="text-muted-foreground">
          Work orders, maintenance & repairs scheduling
        </p>
      </div>
      <div className="flex items-center space-x-2">
        {onAddTask && (
          <Button onClick={onAddTask} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Task</span>
          </Button>
        )}
        <div className="flex items-center rounded-md border bg-background p-1">
          <Button
            variant={view === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("month")}
            className="text-xs"
          >
            Month
          </Button>
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("week")}
            className="text-xs"
          >
            Week
          </Button>
          <Button
            variant={view === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("day")}
            className="text-xs"
          >
            Day
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={navigateToday}>
          Today
        </Button>
        <div className="flex items-center space-x-1">
          <Button size="icon" variant="outline" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center px-2">
            {view === "month" && (
              <div className="font-medium">{format(currentDate, "MMMM yyyy")}</div>
            )}
            {view === "week" && (
              <div className="font-medium">
                Week of {format(currentDate, "MMM d, yyyy")}
              </div>
            )}
            {view === "day" && (
              <div className="font-medium">{format(currentDate, "EEEE, MMMM d, yyyy")}</div>
            )}
          </div>
          <Button size="icon" variant="outline" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
