import { useState } from 'react';
import { useStaffForPlanner, useEquipmentForPlanner, useWorkOrdersForPlanner } from '@/hooks/usePlannerData';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Wrench, FileText, Search, X, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlannerResourceSidebarProps {
  onClose: () => void;
}

export function PlannerResourceSidebar({ onClose }: PlannerResourceSidebarProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('staff');

  const { data: staff } = useStaffForPlanner();
  const { data: equipment } = useEquipmentForPlanner();
  const { data: workOrders } = useWorkOrdersForPlanner();

  const filteredStaff = staff?.filter(
    (s) =>
      !search ||
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredEquipment = equipment?.filter(
    (e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.equipment_type?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWorkOrders = workOrders?.filter(
    (wo) =>
      !search ||
      wo.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-[280px] border-l border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Resources</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2 grid grid-cols-3">
          <TabsTrigger value="staff" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs">
            <Wrench className="h-3 w-3 mr-1" />
            Equipment
          </TabsTrigger>
          <TabsTrigger value="work" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Work
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Staff Tab */}
          <TabsContent value="staff" className="m-0 p-3 space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Drag staff to assign to tasks
            </p>
            {filteredStaff?.map((s) => (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'staff',
                    id: s.id,
                    name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email,
                    job_title: s.job_title,
                    avatar_url: s.avatar_url,
                    initials: (s.first_name?.[0] || '') + (s.last_name?.[0] || ''),
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border border-border bg-card',
                  'cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors'
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Avatar className="h-7 w-7">
                  <AvatarImage src={s.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {(s.first_name?.[0] || '') + (s.last_name?.[0] || '')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email}
                  </p>
                  {s.job_title && (
                    <p className="text-xs text-muted-foreground truncate">{s.job_title}</p>
                  )}
                </div>
              </div>
            ))}
            {filteredStaff?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No staff found</p>
            )}
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="m-0 p-3 space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Drag equipment to schedule
            </p>
            {filteredEquipment?.map((eq) => (
              <div
                key={eq.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'equipment',
                    id: eq.id,
                    name: eq.name,
                    equipment_type: eq.equipment_type,
                    unit_number: eq.unit_number,
                    status: eq.status || 'Available',
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border border-border bg-card',
                  'cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors'
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{eq.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {eq.equipment_type} {eq.unit_number && `• ${eq.unit_number}`}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {eq.status || 'Available'}
                </Badge>
              </div>
            ))}
            {filteredEquipment?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No equipment found</p>
            )}
          </TabsContent>

          {/* Work Orders Tab */}
          <TabsContent value="work" className="m-0 p-3 space-y-2">
            <p className="text-xs text-muted-foreground mb-2">
              Unscheduled work orders
            </p>
            {filteredWorkOrders?.slice(0, 20).map((wo) => (
              <div
                key={wo.id}
                draggable
                className={cn(
                  'p-2 rounded-lg border border-border bg-card',
                  'cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors'
                )}
              >
              <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{wo.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px]',
                          wo.priority === 'urgent' && 'border-red-500 text-red-500',
                          wo.priority === 'high' && 'border-amber-500 text-amber-500'
                        )}
                      >
                        {wo.priority}
                      </Badge>
                      {wo.estimated_hours && (
                        <span className="text-[10px] text-muted-foreground">
                          {wo.estimated_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredWorkOrders?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No work orders found</p>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
