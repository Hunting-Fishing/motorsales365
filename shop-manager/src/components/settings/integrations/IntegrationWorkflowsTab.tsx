import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Pause, 
  Settings, 
  TrendingUp, 
  Zap, 
  Clock,
  Activity,
  BarChart3,
  Users,
  Database
} from 'lucide-react';

interface IntegrationWorkflowsTabProps {
  integrationId: string;
}

export function IntegrationWorkflowsTab({ integrationId }: IntegrationWorkflowsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Integration Workflows</h3>
          <p className="text-sm text-muted-foreground">
            Automate data synchronization and business processes
          </p>
        </div>
        <Button>
          <Zap className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="field-mapping">Field Mapping</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            <WorkflowCard
              name="Customer Sync"
              description="Automatically sync customer data when created or updated"
              trigger="Data Change"
              isActive={true}
              lastRun="2 minutes ago"
              successRate={98}
            />
            <WorkflowCard
              name="Invoice Export"
              description="Export completed invoices to accounting system"
              trigger="Schedule"
              isActive={true}
              lastRun="1 hour ago"
              successRate={100}
            />
            <WorkflowCard
              name="Status Notifications"
              description="Send notifications when work order status changes"
              trigger="Webhook"
              isActive={false}
              lastRun="Never"
              successRate={0}
            />
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TemplateCard
              name="Basic Customer Sync"
              description="Synchronize customer data between your shop and QuickBooks"
              category="Accounting"
              difficulty="Easy"
            />
            <TemplateCard
              name="Customer Email Sync"
              description="Add new customers to Mailchimp mailing lists"
              category="Marketing"
              difficulty="Easy"
            />
            <TemplateCard
              name="Work Order Tracking"
              description="Track work order progress in project management tools"
              category="Operations"
              difficulty="Medium"
            />
            <TemplateCard
              name="Inventory Alerts"
              description="Get notified when inventory levels are low"
              category="Inventory"
              difficulty="Easy"
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Executions"
              value="1,234"
              change="+12%"
              icon={Activity}
            />
            <MetricCard
              title="Success Rate"
              value="98.5%"
              change="+2.3%"
              icon={TrendingUp}
            />
            <MetricCard
              title="Avg. Execution Time"
              value="2.3s"
              change="-0.5s"
              icon={Clock}
            />
            <MetricCard
              title="Data Synced"
              value="45.6K"
              change="+8%"
              icon={Database}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Performance</CardTitle>
              <CardDescription>
                Execution success rate over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Chart placeholder - Success rate trends
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="field-mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping Configuration</CardTitle>
              <CardDescription>
                Map fields between your shop and external systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FieldMappingRow
                  sourceField="customer.first_name"
                  targetField="Name"
                  fieldType="Text"
                />
                <FieldMappingRow
                  sourceField="customer.email"
                  targetField="PrimaryEmailAddr.Address"
                  fieldType="Email"
                />
                <FieldMappingRow
                  sourceField="customer.phone"
                  targetField="PrimaryPhone.FreeFormNumber"
                  fieldType="Phone"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface WorkflowCardProps {
  name: string;
  description: string;
  trigger: string;
  isActive: boolean;
  lastRun: string;
  successRate: number;
}

function WorkflowCard({ name, description, trigger, isActive, lastRun, successRate }: WorkflowCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{name}</h4>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">{trigger}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Last run: {lastRun}</span>
              <span>Success rate: {successRate}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TemplateCardProps {
  name: string;
  description: string;
  category: string;
  difficulty: string;
}

function TemplateCard({ name, description, category, difficulty }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Use Template
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{category}</Badge>
          <Badge variant="outline">{difficulty}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
}

function MetricCard({ title, value, change, icon: Icon }: MetricCardProps) {
  const isPositive = change.startsWith('+');
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {change} from last month
            </p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

interface FieldMappingRowProps {
  sourceField: string;
  targetField: string;
  fieldType: string;
}

function FieldMappingRow({ sourceField, targetField, fieldType }: FieldMappingRowProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="font-medium">{sourceField}</span>
        </div>
        <div className="text-muted-foreground">→</div>
        <div className="text-sm">
          <span className="font-medium">{targetField}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{fieldType}</Badge>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}