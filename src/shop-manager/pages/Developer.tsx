
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building, 
  Store, 
  BarChart3, 
  Users, 
  Shield, 
  Settings, 
  Hammer,
  ArrowRight,
  Wrench,
  Database,
  FileText,
  Search,
  Clock,
  Crown
} from 'lucide-react';

const developerModules = [
  {
    title: 'Service Management',
    description: 'Manage service hierarchy, categories, subcategories, and import service jobs',
    icon: Wrench,
    path: '/developer/service-management',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Organization Management',
    description: 'Manage organization details, shops, and access controls',
    icon: Building,
    path: '/developer/organization',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    title: 'Shopping Controls',
    description: 'Manage affiliate products, categories, and user submissions',
    icon: Store,
    path: '/developer/shopping',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Analytics Dashboard',
    description: 'View comprehensive analytics and reporting',
    icon: BarChart3,
    path: '/developer/analytics',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  {
    title: 'User Management',
    description: 'Manage application users and their permissions',
    icon: Users,
    path: '/developer/users',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    title: 'Security Settings',
    description: 'Manage security configurations and access controls',
    icon: Shield,
    path: '/developer/security',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  {
    title: 'System Settings',
    description: 'Configure application-wide settings',
    icon: Settings,
    path: '/developer/system',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    title: 'Tools Management',
    description: 'Manage tools, equipment, and their categories',
    icon: Hammer,
    path: '/developer/tools',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    title: 'Trial Management',
    description: 'Extend trials and manage subscription periods for shops',
    icon: Clock,
    path: '/developer/trials',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    title: 'Platform Developers',
    description: 'Manage god-mode developer accounts with full platform access',
    icon: Crown,
    path: '/developer/platform-developers',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
];

export default function Developer() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developer Portal</h1>
        <p className="text-muted-foreground">
          Development and administrative tools for managing your application
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {developerModules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.path} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg ${module.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${module.color}`} />
                </div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
                <CardDescription className="text-sm">
                  {module.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button asChild variant="outline" className="w-full">
                  <Link to={module.path} className="flex items-center justify-center gap-2">
                    Open Module
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Overview of your application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">8</div>
              <div className="text-sm text-muted-foreground">Active Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-sm text-muted-foreground">System Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">v1.0</div>
              <div className="text-sm text-muted-foreground">App Version</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">🔧</div>
              <div className="text-sm text-muted-foreground">Dev Mode</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
