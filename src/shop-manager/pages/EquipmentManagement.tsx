import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { EquipmentList } from '@/components/equipment/EquipmentList';
import { MaintenanceRequestsList } from '@/components/equipment/MaintenanceRequestsList';
import { EquipmentReportsList } from '@/components/equipment/EquipmentReportsList';
import { PMSchedulesList } from '@/components/equipment/PMSchedulesList';
import { ToolsList } from '@/components/equipment/ToolsList';
import { ToolRequestForms } from '@/components/equipment/ToolRequestForms';
import { SafetyEquipmentList } from '@/components/equipment/SafetyEquipmentList';
import { AddEquipmentDialog } from '@/components/equipment/AddEquipmentDialog';
import { EquipmentPartsHistory } from '@/components/equipment/EquipmentPartsHistory';
import { FuturePlanningList } from '@/components/equipment/FuturePlanningList';
import { EquipmentManualsLibrary } from '@/components/equipment/EquipmentManualsLibrary';
import { EnginesList } from '@/components/equipment/EnginesList';
import { EquipmentInspectionsTab } from '@/components/equipment/EquipmentInspectionsTab';
import { Wrench, ClipboardList, FileText, Calendar, Hammer, ShieldCheck, Package, Lightbulb, BookOpen, Fuel, ClipboardCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEquipmentByAssetClass } from '@/hooks/useEquipmentByAssetClass';

export default function EquipmentManagement() {
  const [activeTab, setActiveTab] = useState('equipment');
  const [dialogOpen, setDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  // Filter to only show shop equipment (tools, small engines, safety gear)
  const { equipment, isLoading, refetch } = useEquipmentByAssetClass('shop_equipment');

  const tabs = [
    { value: 'equipment', label: 'Equipment', icon: Wrench },
    { value: 'inspections', label: 'Inspections', icon: ClipboardCheck },
    { value: 'engines', label: 'Engines', icon: Fuel },
    { value: 'manuals', label: 'Manuals', icon: BookOpen },
    { value: 'future-planning', label: 'Future Planning', icon: Lightbulb },
    { value: 'parts', label: 'Parts History', icon: Package },
    { value: 'safety', label: 'Safety Equipment', icon: ShieldCheck },
    { value: 'tools', label: 'Tools', icon: Hammer },
    { value: 'tool-forms', label: 'Request Forms', icon: FileText },
    { value: 'requests', label: 'Maintenance', icon: ClipboardList },
    { value: 'reports', label: 'Reports', icon: FileText },
    { value: 'pm', label: 'PM Schedules', icon: Calendar }
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Equipment & Tool Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage shop tools, small engines, diagnostic equipment, and safety gear
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Equipment
        </Button>
      </div>

      <AddEquipmentDialog 
        open={dialogOpen} 
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) refetch();
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {isMobile ? (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full mb-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ) : (
          <TabsList className="grid w-full grid-cols-12 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}

        <TabsContent value="equipment" className="space-y-4">
          <EquipmentList equipment={equipment} loading={isLoading} onUpdate={refetch} />
        </TabsContent>

        <TabsContent value="inspections" className="space-y-4">
          <EquipmentInspectionsTab />
        </TabsContent>

        <TabsContent value="engines" className="space-y-4">
          <EnginesList />
        </TabsContent>

        <TabsContent value="manuals" className="space-y-4">
          <EquipmentManualsLibrary />
        </TabsContent>

        <TabsContent value="future-planning" className="space-y-4">
          <FuturePlanningList />
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <EquipmentPartsHistory />
        </TabsContent>

        <TabsContent value="safety" className="space-y-4">
          <SafetyEquipmentList />
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <ToolsList />
        </TabsContent>

        <TabsContent value="tool-forms" className="space-y-4">
          <ToolRequestForms />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <MaintenanceRequestsList />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <EquipmentReportsList />
        </TabsContent>

        <TabsContent value="pm" className="space-y-4">
          <PMSchedulesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
