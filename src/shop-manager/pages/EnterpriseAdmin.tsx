import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, BarChart3, Users, Settings, Key, Activity } from 'lucide-react';
import { EnterpriseDashboard } from '@/components/enterprise/EnterpriseDashboard';
import { SecurityManagement } from '@/components/enterprise/SecurityManagement';
import { AuditTrail } from '@/components/enterprise/AuditTrail';
import { PerformanceMonitoring } from '@/components/enterprise/PerformanceMonitoring';
import { UserRoleManagement } from '@/components/enterprise/UserRoleManagement';
import { ApiTokenManagement } from '@/components/enterprise/ApiTokenManagement';
import { BIReporting } from '@/components/enterprise/BIReporting';
import { SystemSettings } from '@/components/enterprise/SystemSettings';

export const EnterpriseAdmin = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Enterprise Administration</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive enterprise management and monitoring dashboard
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">API</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <EnterpriseDashboard />
          </TabsContent>

          <TabsContent value="security">
            <SecurityManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserRoleManagement />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrail />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceMonitoring />
          </TabsContent>

          <TabsContent value="api">
            <ApiTokenManagement />
          </TabsContent>

          <TabsContent value="reports">
            <BIReporting />
          </TabsContent>

          <TabsContent value="settings">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnterpriseAdmin;