import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Phone, 
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  Activity,
  Plus,
  Settings,
  Eye
} from 'lucide-react';
import { useNotificationRules } from '@/hooks/workflows/useNotificationRules';
import { useEscalationRules } from '@/hooks/workflows/useEscalationRules';
import { useNotificationAnalytics } from '@/hooks/workflows/useNotificationAnalytics';
import { NotificationRuleBuilder } from './NotificationRuleBuilder';
import { EscalationRuleBuilder } from './EscalationRuleBuilder';
import { NotificationQueueMonitor } from './NotificationQueueMonitor';
import { NotificationAnalyticsDashboard } from './NotificationAnalyticsDashboard';

export function NotificationAutomation() {
  const [activeTab, setActiveTab] = useState('rules');
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showEscalationBuilder, setShowEscalationBuilder] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const { 
    notificationRules, 
    isLoading: rulesLoading, 
    toggleRule, 
    deleteRule 
  } = useNotificationRules();

  const { 
    escalationRules, 
    isLoading: escalationLoading, 
    toggleEscalationRule, 
    deleteEscalationRule 
  } = useEscalationRules();

  const { analytics, isLoading: analyticsLoading } = useNotificationAnalytics();

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'in_app': return <Bell className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4:
      case 5: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showRuleBuilder) {
    return (
      <NotificationRuleBuilder
        rule={selectedRule}
        onSave={() => {
          setShowRuleBuilder(false);
          setSelectedRule(null);
        }}
        onCancel={() => {
          setShowRuleBuilder(false);
          setSelectedRule(null);
        }}
      />
    );
  }

  if (showEscalationBuilder) {
    return (
      <EscalationRuleBuilder
        rule={selectedRule}
        onSave={() => {
          setShowEscalationBuilder(false);
          setSelectedRule(null);
        }}
        onCancel={() => {
          setShowEscalationBuilder(false);
          setSelectedRule(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Notification Automation</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowRuleBuilder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Notification Rule
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowEscalationBuilder(true)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Add Escalation Rule
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{notificationRules?.filter(r => r.is_active).length || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Notifications</p>
                <p className="text-2xl font-bold">{analytics?.pending_notifications || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sent Today</p>
                <p className="text-2xl font-bold">{analytics?.sent_today || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{analytics?.delivery_rate || 0}%</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Notification Rules
          </TabsTrigger>
          <TabsTrigger value="escalations" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Escalations
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Queue Monitor
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Rules</CardTitle>
              <CardDescription>
                Manage automated notification triggers and delivery settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-gray-100 h-20 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {notificationRules?.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge className={getPriorityColor(rule.priority)}>
                            Priority {rule.priority}
                          </Badge>
                          <Badge variant="outline">
                            {rule.trigger_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRule(rule);
                              setShowRuleBuilder(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteRule(rule.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Target:</span>
                          <Badge variant="secondary">{rule.target_audience}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Channels:</span>
                          <div className="flex gap-1">
                            {rule.channels.map((channel: string) => (
                              <div key={channel} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                                {getChannelIcon(channel)}
                                {channel}
                              </div>
                            ))}
                          </div>
                        </div>
                        {rule.delay_minutes > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">Delay: {rule.delay_minutes}m</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {(!notificationRules || notificationRules.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No notification rules configured yet</p>
                      <Button 
                        className="mt-4" 
                        onClick={() => setShowRuleBuilder(true)}
                      >
                        Create Your First Rule
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Rules</CardTitle>
              <CardDescription>
                Automatic escalation workflows for overdue and problematic work orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {escalationLoading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <div key={i} className="animate-pulse bg-gray-100 h-24 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {escalationRules?.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant="outline">
                            {rule.trigger_condition.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => toggleEscalationRule(rule.id, checked)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRule(rule);
                              setShowEscalationBuilder(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteEscalationRule(rule.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Steps:</span>
                          <Badge variant="secondary">
                            {Array.isArray(rule.escalation_steps) ? rule.escalation_steps.length : 0} levels
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Trigger:</span>
                          <span className="text-sm">
                            {rule.trigger_config?.initial_hours}h overdue
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!escalationRules || escalationRules.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No escalation rules configured yet</p>
                      <Button 
                        className="mt-4" 
                        onClick={() => setShowEscalationBuilder(true)}
                      >
                        Create Escalation Rule
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <NotificationQueueMonitor />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <NotificationAnalyticsDashboard analytics={analytics} isLoading={analyticsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}