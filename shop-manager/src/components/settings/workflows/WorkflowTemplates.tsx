import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Clock, 
  Users, 
  AlertCircle, 
  CheckCircle,
  ArrowRight,
  Bell,
  UserCheck
} from 'lucide-react';

interface WorkflowTemplatesProps {
  onUseTemplate: (template: any) => void;
}

const WORKFLOW_TEMPLATES = [
  {
    id: 'auto-assign-high-priority',
    name: 'Auto-assign High Priority Orders',
    description: 'Automatically assign high priority work orders to available technicians',
    category: 'Assignment',
    icon: UserCheck,
    color: 'bg-blue-500',
    triggers: ['Work order created', 'Priority = High'],
    actions: ['Find available technician', 'Assign work order', 'Send notification'],
    useCase: 'Ensure critical work orders get immediate attention'
  },
  {
    id: 'overdue-escalation',
    name: 'Overdue Work Order Escalation',
    description: 'Escalate work orders that exceed their due date',
    category: 'Escalation',
    icon: AlertCircle,
    color: 'bg-red-500',
    triggers: ['Work order overdue', 'Status = In Progress'],
    actions: ['Change priority to urgent', 'Notify manager', 'Add escalation note'],
    useCase: 'Prevent work orders from falling through the cracks'
  },
  {
    id: 'status-notifications',
    name: 'Customer Status Updates',
    description: 'Notify customers when work order status changes',
    category: 'Communication',
    icon: Bell,
    color: 'bg-green-500',
    triggers: ['Status changed', 'Customer email exists'],
    actions: ['Send email notification', 'Update customer portal'],
    useCase: 'Keep customers informed about their service progress'
  },
  {
    id: 'completion-followup',
    name: 'Completion Follow-up',
    description: 'Send follow-up messages after work order completion',
    category: 'Follow-up',
    icon: CheckCircle,
    color: 'bg-purple-500',
    triggers: ['Status = Completed', 'Wait 24 hours'],
    actions: ['Send satisfaction survey', 'Schedule follow-up call'],
    useCase: 'Gather feedback and maintain customer relationships'
  },
  {
    id: 'team-load-balancing',
    name: 'Team Load Balancing',
    description: 'Distribute work evenly across available technicians',
    category: 'Assignment',
    icon: Users,
    color: 'bg-orange-500',
    triggers: ['Work order created', 'Technician availability check'],
    actions: ['Calculate workload', 'Assign to least busy technician'],
    useCase: 'Optimize team efficiency and prevent burnout'
  },
  {
    id: 'scheduled-reminders',
    name: 'Scheduled Maintenance Reminders',
    description: 'Create reminder tasks for scheduled maintenance',
    category: 'Maintenance',
    icon: Clock,
    color: 'bg-teal-500',
    triggers: ['Maintenance due date approaching', 'Customer active'],
    actions: ['Create reminder task', 'Schedule customer contact'],
    useCase: 'Proactively maintain customer equipment'
  }
];

export function WorkflowTemplates({ onUseTemplate }: WorkflowTemplatesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Workflow Templates</h2>
        <p className="text-muted-foreground">
          Get started quickly with pre-built workflow templates for common automation scenarios
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {WORKFLOW_TEMPLATES.map((template) => {
          const IconComponent = template.icon;
          return (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${template.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Triggers:</h4>
                  <div className="space-y-1">
                    {template.triggers.map((trigger, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        {trigger}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Actions:</h4>
                  <div className="space-y-1">
                    {template.actions.map((action, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowRight className="h-3 w-3" />
                        {action}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-3">
                    <strong>Use Case:</strong> {template.useCase}
                  </div>
                  <Button 
                    onClick={() => onUseTemplate(template)} 
                    className="w-full"
                    variant="outline"
                  >
                    Use This Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 bg-muted/50 rounded-full mb-4">
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Need a Custom Workflow?</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Can't find the right template? Create a custom workflow from scratch to match your specific business needs.
          </p>
          <Button onClick={() => onUseTemplate(null)}>
            Create Custom Workflow
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}