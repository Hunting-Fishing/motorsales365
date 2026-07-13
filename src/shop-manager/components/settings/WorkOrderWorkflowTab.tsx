import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { supabase } from '@/integrations/supabase/client';
import { 
  Workflow, 
  Save, 
  Plus, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Settings,
  Zap
} from 'lucide-react';

interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
  priority: number;
  description?: string;
}

interface AutomationSettings {
  auto_assign_technicians: boolean;
  auto_send_notifications: boolean;
  auto_update_status: boolean;
  escalation_enabled: boolean;
  escalation_hours: number;
  reminder_intervals: number[];
  workflow_rules: WorkflowRule[];
}

const defaultSettings: AutomationSettings = {
  auto_assign_technicians: false,
  auto_send_notifications: true,
  auto_update_status: false,
  escalation_enabled: false,
  escalation_hours: 24,
  reminder_intervals: [2, 24, 72],
  workflow_rules: []
};

const TRIGGER_OPTIONS = [
  { value: 'status_change', label: 'Status Change' },
  { value: 'time_elapsed', label: 'Time Elapsed' },
  { value: 'part_arrival', label: 'Part Arrival' },
  { value: 'customer_approval', label: 'Customer Approval' },
  { value: 'manual_trigger', label: 'Manual Trigger' }
];

const ACTION_OPTIONS = [
  { value: 'assign_technician', label: 'Assign Technician' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'update_status', label: 'Update Status' },
  { value: 'create_invoice', label: 'Create Invoice' },
  { value: 'schedule_followup', label: 'Schedule Follow-up' }
];

export function WorkOrderWorkflowTab() {
  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState<Partial<WorkflowRule>>({});
  const [showAddRule, setShowAddRule] = useState(false);
  const { toast } = useToast();
  const { shopId, loading: shopLoading, error: shopError } = useShopId();

  useEffect(() => {
    if (shopId) {
      loadSettings();
    }
  }, [shopId]);

  const loadSettings = async () => {
    if (!shopId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('settings_value')
        .eq('shop_id', shopId)
        .eq('settings_key', 'work_order_workflow')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.settings_value) {
        const settingsData = data.settings_value as unknown;
        if (typeof settingsData === 'object' && settingsData !== null) {
          setSettings({ ...defaultSettings, ...(settingsData as Partial<AutomationSettings>) });
        }
      }
    } catch (error) {
      console.error('Error loading workflow settings:', error);
      toast({
        title: "Error",
        description: "Failed to load workflow settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!shopId) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          shop_id: shopId,
          settings_key: 'work_order_workflow',
          settings_value: settings as any,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workflow settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving workflow settings:', error);
      toast({
        title: "Error",
        description: "Failed to save workflow settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addWorkflowRule = () => {
    if (!newRule.name || !newRule.trigger || !newRule.action) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const rule: WorkflowRule = {
      id: crypto.randomUUID(),
      name: newRule.name!,
      trigger: newRule.trigger!,
      condition: newRule.condition || '',
      action: newRule.action!,
      enabled: true,
      priority: settings.workflow_rules.length + 1,
      description: newRule.description
    };

    setSettings(prev => ({
      ...prev,
      workflow_rules: [...prev.workflow_rules, rule]
    }));

    setNewRule({});
    setShowAddRule(false);
  };

  const removeRule = (ruleId: string) => {
    setSettings(prev => ({
      ...prev,
      workflow_rules: prev.workflow_rules.filter(rule => rule.id !== ruleId)
    }));
  };

  const toggleRule = (ruleId: string) => {
    setSettings(prev => ({
      ...prev,
      workflow_rules: prev.workflow_rules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    }));
  };

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (shopError || !shopId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Unable to load shop information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Workflow className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">Work Order Workflow & Automation</h2>
      </div>

      {/* Workflow Status Info */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="rounded-full p-2 bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Workflow Engine Active</h3>
              <p className="text-sm text-muted-foreground">
                The workflow automation engine is active. Configure your rules below to automate work order processing, notifications, and status updates based on triggers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Basic Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_assign">Auto-Assign Technicians</Label>
                <p className="text-sm text-muted-foreground">Automatically assign work orders based on availability</p>
              </div>
              <Switch
                id="auto_assign"
                checked={settings.auto_assign_technicians}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_assign_technicians: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_notifications">Auto-Send Notifications</Label>
                <p className="text-sm text-muted-foreground">Send automatic status updates to customers</p>
              </div>
              <Switch
                id="auto_notifications"
                checked={settings.auto_send_notifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_send_notifications: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_status">Auto-Update Status</Label>
                <p className="text-sm text-muted-foreground">Update status based on work completion</p>
              </div>
              <Switch
                id="auto_status"
                checked={settings.auto_update_status}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_update_status: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="escalation">Enable Escalation</Label>
                <p className="text-sm text-muted-foreground">Escalate overdue work orders</p>
              </div>
              <Switch
                id="escalation"
                checked={settings.escalation_enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, escalation_enabled: checked }))}
              />
            </div>
          </div>

          {settings.escalation_enabled && (
            <div className="space-y-2">
              <Label htmlFor="escalation_hours">Escalation Time (hours)</Label>
              <Input
                id="escalation_hours"
                type="number"
                min="1"
                value={settings.escalation_hours}
                onChange={(e) => setSettings(prev => ({ ...prev, escalation_hours: parseInt(e.target.value) || 24 }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Reminder Intervals (hours)</Label>
            <div className="flex gap-2 flex-wrap">
              {settings.reminder_intervals.map((interval, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {interval}h
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => {
                      setSettings(prev => ({
                        ...prev,
                        reminder_intervals: prev.reminder_intervals.filter((_, i) => i !== index)
                      }));
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newInterval = prompt('Enter reminder interval (hours):');
                  if (newInterval && !isNaN(Number(newInterval))) {
                    setSettings(prev => ({
                      ...prev,
                      reminder_intervals: [...prev.reminder_intervals, Number(newInterval)]
                    }));
                  }
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Workflow Rules
            </div>
            <Button onClick={() => setShowAddRule(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.workflow_rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No workflow rules configured. Click "Add Rule" to create your first automation rule.
            </div>
          ) : (
            settings.workflow_rules.map((rule) => (
              <div key={rule.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                    <div>
                      <h4 className="font-medium">{rule.name}</h4>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule(rule.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{TRIGGER_OPTIONS.find(t => t.value === rule.trigger)?.label}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="outline">{ACTION_OPTIONS.find(a => a.value === rule.action)?.label}</Badge>
                  {rule.condition && (
                    <>
                      <span className="text-muted-foreground">when</span>
                      <Badge variant="secondary">{rule.condition}</Badge>
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          {showAddRule && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium">Add New Workflow Rule</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule_name">Rule Name</Label>
                  <Input
                    id="rule_name"
                    value={newRule.name || ''}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter rule name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule_trigger">Trigger</Label>
                  <Select value={newRule.trigger} onValueChange={(value) => setNewRule(prev => ({ ...prev, trigger: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIGGER_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule_condition">Condition (optional)</Label>
                  <Input
                    id="rule_condition"
                    value={newRule.condition || ''}
                    onChange={(e) => setNewRule(prev => ({ ...prev, condition: e.target.value }))}
                    placeholder="e.g., status = 'pending'"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule_action">Action</Label>
                  <Select value={newRule.action} onValueChange={(value) => setNewRule(prev => ({ ...prev, action: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rule_description">Description</Label>
                <Textarea
                  id="rule_description"
                  value={newRule.description || ''}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule does"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={addWorkflowRule}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
                <Button variant="outline" onClick={() => setShowAddRule(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} className="min-w-32">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>
    </div>
  );
}