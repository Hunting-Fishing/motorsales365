import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  BarChart3,
  Download,
  Upload,
  Search,
  Filter,
  Zap
} from 'lucide-react';

export function WorkOrderQuickActions() {
  const actions = [
    {
      icon: Plus,
      title: 'Create Work Order',
      description: 'Start a new work order',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      onClick: () => console.log('Create work order')
    },
    {
      icon: Search,
      title: 'Search Orders',
      description: 'Find existing work orders',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      onClick: () => console.log('Search work orders')
    },
    {
      icon: Users,
      title: 'Assign Technician',
      description: 'Assign work to team members',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      onClick: () => console.log('Assign technician')
    },
    {
      icon: Calendar,
      title: 'Schedule Service',
      description: 'Schedule upcoming services',
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      onClick: () => console.log('Schedule service')
    },
    {
      icon: FileText,
      title: 'Generate Report',
      description: 'Create work order reports',
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      onClick: () => console.log('Generate report')
    },
    {
      icon: Download,
      title: 'Export Data',
      description: 'Export work order data',
      color: 'bg-gradient-to-br from-teal-500 to-teal-600',
      onClick: () => console.log('Export data')
    }
  ];

  const bulkActions = [
    { label: 'Bulk Update Status', icon: Settings },
    { label: 'Bulk Assign Technician', icon: Users },
    { label: 'Bulk Schedule', icon: Calendar },
    { label: 'Bulk Export', icon: Download }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={action.onClick}
                  className="group p-4 rounded-lg border border-border hover:border-border/80 transition-all hover:shadow-md bg-card text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm group-hover:text-foreground/90">
                        {action.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            Bulk Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {bulkActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3"
                  onClick={() => console.log(action.label)}
                >
                  <Icon className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Templates */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Recent Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              'Oil Change Service',
              'Brake Inspection',
              'AC Service',
              'Engine Diagnostic'
            ].map((template) => (
              <Button
                key={template}
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => console.log(`Use template: ${template}`)}
              >
                {template}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}