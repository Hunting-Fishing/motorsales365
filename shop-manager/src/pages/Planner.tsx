import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Kanban, GanttChart, PenTool, BarChart3, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlannerView } from '@/types/planner';
import { PlannerKanbanBoard } from '@/components/planner/board/PlannerKanbanBoard';
import { ResourceTimeline } from '@/components/planner/timeline/ResourceTimeline';
import { PlannerWhiteboard } from '@/components/planner/whiteboard/PlannerWhiteboard';
import { CapacityDashboard } from '@/components/planner/capacity/CapacityDashboard';
import { PlannerCalendarView } from '@/components/planner/calendar/PlannerCalendarView';
import { PlannerResourceSidebar } from '@/components/planner/sidebar/PlannerResourceSidebar';

const Planner = () => {
  const [activeView, setActiveView] = useState<PlannerView>('kanban');
  const [showResourceSidebar, setShowResourceSidebar] = useState(true);

  const tabs = [
    { id: 'calendar' as PlannerView, label: 'Calendar', icon: Calendar },
    { id: 'kanban' as PlannerView, label: 'Board', icon: Kanban },
    { id: 'timeline' as PlannerView, label: 'Timeline', icon: GanttChart },
    { id: 'whiteboard' as PlannerView, label: 'Whiteboard', icon: PenTool },
    { id: 'capacity' as PlannerView, label: 'Capacity', icon: BarChart3 },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planner</h1>
          <p className="text-sm text-muted-foreground">
            Plan, schedule, and manage work across your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResourceSidebar(!showResourceSidebar)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Resources
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeView}
        onValueChange={(v) => setActiveView(v as PlannerView)}
        className="flex-1 flex flex-col"
      >
        <div className="px-6 py-2 border-b border-border bg-muted/30">
          <TabsList className="bg-transparent gap-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4"
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="calendar" className="h-full m-0">
              <PlannerCalendarView />
            </TabsContent>

            <TabsContent value="kanban" className="h-full m-0">
              <PlannerKanbanBoard />
            </TabsContent>

            <TabsContent value="timeline" className="h-full m-0">
              <ResourceTimeline />
            </TabsContent>

            <TabsContent value="whiteboard" className="h-full m-0">
              <PlannerWhiteboard />
            </TabsContent>

            <TabsContent value="capacity" className="h-full m-0">
              <CapacityDashboard />
            </TabsContent>
          </div>

          {/* Resource Sidebar */}
          {showResourceSidebar && (
            <PlannerResourceSidebar onClose={() => setShowResourceSidebar(false)} />
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default Planner;
