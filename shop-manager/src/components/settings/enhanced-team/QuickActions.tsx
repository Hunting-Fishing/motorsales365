import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, 
  Building2, 
  Shield, 
  Download, 
  Upload,
  Settings,
  Calendar,
  FileText
} from 'lucide-react';

export function QuickActions() {
  const actions = [
    {
      icon: UserPlus,
      title: 'Add Team Member',
      description: 'Invite new member to join your team',
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      onClick: () => console.log('Add team member')
    },
    {
      icon: Building2,
      title: 'Create Department',
      description: 'Set up a new department structure',
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      onClick: () => console.log('Create department')
    },
    {
      icon: Shield,
      title: 'Manage Roles',
      description: 'Define roles and permissions',
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      onClick: () => console.log('Manage roles')
    },
    {
      icon: Calendar,
      title: 'Schedule Meeting',
      description: 'Organize team meetings and events',
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      onClick: () => console.log('Schedule meeting')
    },
    {
      icon: Download,
      title: 'Export Data',
      description: 'Download team reports and data',
      color: 'bg-gradient-to-br from-teal-500 to-teal-600',
      onClick: () => console.log('Export data')
    },
    {
      icon: FileText,
      title: 'Generate Report',
      description: 'Create team performance reports',
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      onClick: () => console.log('Generate report')
    }
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.title}
                onClick={action.onClick}
                className="group p-4 rounded-lg border border-border hover:border-border/80 transition-all hover:shadow-md bg-card"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
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
  );
}