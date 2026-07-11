import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkOrderNumberingTab } from './WorkOrderNumberingTab';
import { WorkOrderWorkflowTab } from './WorkOrderWorkflowTab';
import { WorkOrderTemplateTab } from './WorkOrderTemplateTab';
import { WorkOrderStatusTab } from './WorkOrderStatusTab';
import { WorkflowAutomationTab } from './WorkflowAutomationTab';
import { EnhancedWorkOrdersDashboard } from './EnhancedWorkOrdersDashboard';
import { 
  Hash, 
  Workflow, 
  FileText, 
  CircleDot, 
  BarChart3,
  Settings,
  Zap
} from 'lucide-react';

export function WorkOrderManagementTab() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      component: EnhancedWorkOrdersDashboard
    },
    {
      id: 'numbering',
      label: 'Numbering',
      icon: Hash,
      component: WorkOrderNumberingTab
    },
    {
      id: 'statuses',
      label: 'Status Management',
      icon: CircleDot,
      component: WorkOrderStatusTab
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: FileText,
      component: WorkOrderTemplateTab
    },
    {
      id: 'workflow',
      label: 'Basic Workflow',
      icon: Workflow,
      component: WorkOrderWorkflowTab
    },
    {
      id: 'automation',
      label: 'Advanced Automation',
      icon: Zap,
      component: WorkflowAutomationTab
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Work Order Management</h1>
      </div>
      <p className="text-muted-foreground">
        Configure work order settings, workflows, templates, and automation rules.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 w-full">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center gap-2 text-sm"
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabs.map((tab) => {
          const Component = tab.component;
          return (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              <Component />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}