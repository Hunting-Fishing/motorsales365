import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Trash2, Settings, Zap, Filter, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WorkflowConditionBuilder } from './WorkflowConditionBuilder';
import { WorkflowActionBuilder } from './WorkflowActionBuilder';

interface WorkflowBuilderProps {
  workflowId?: string | null;
  onClose: () => void;
}

interface WorkflowData {
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: any;
  conditions: any[];
  actions: any[];
}

const TRIGGER_TYPES = [
  { value: 'status_change', label: 'Status Change', description: 'When work order status changes' },
  { value: 'time_based', label: 'Time Based', description: 'At specific times or intervals' },
  { value: 'field_change', label: 'Field Change', description: 'When any field value changes' },
  { value: 'customer_action', label: 'Customer Action', description: 'When customer performs action' }
];

export function WorkflowBuilder({ workflowId, onClose }: WorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<WorkflowData>({
    name: '',
    description: '',
    trigger_type: '',
    trigger_config: {},
    conditions: [],
    actions: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (workflowId) {
      loadWorkflow();
    }
  }, [workflowId]);

  const loadWorkflow = async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      
      // Load trigger
      const { data: triggerData, error: triggerError } = await supabase
        .from('workflow_triggers')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (triggerError) throw triggerError;

      // Load conditions
      const { data: conditionsData, error: conditionsError } = await supabase
        .from('workflow_conditions')
        .select('*')
        .eq('trigger_id', workflowId)
        .order('condition_order');

      if (conditionsError) throw conditionsError;

      // Load actions
      const { data: actionsData, error: actionsError } = await supabase
        .from('workflow_actions')
        .select('*')
        .eq('trigger_id', workflowId)
        .order('action_order');

      if (actionsError) throw actionsError;

      setWorkflow({
        name: triggerData.name,
        description: triggerData.description || '',
        trigger_type: triggerData.trigger_type,
        trigger_config: triggerData.trigger_config,
        conditions: conditionsData || [],
        actions: actionsData || []
      });
    } catch (error) {
      console.error('Error loading workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflow',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveWorkflow = async () => {
    if (!workflow.name || !workflow.trigger_type) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);

      // Get current user's shop_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.shop_id) {
        throw new Error('Shop not found');
      }

      let triggerId = workflowId;

      // Save or update trigger
      if (workflowId) {
        const { error } = await supabase
          .from('workflow_triggers')
          .update({
            name: workflow.name,
            description: workflow.description,
            trigger_type: workflow.trigger_type,
            trigger_config: workflow.trigger_config
          })
          .eq('id', workflowId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('workflow_triggers')
          .insert({
            name: workflow.name,
            description: workflow.description,
            trigger_type: workflow.trigger_type,
            trigger_config: workflow.trigger_config,
            shop_id: profile.shop_id,
            created_by: (await supabase.auth.getUser()).data.user?.id || ''
          })
          .select()
          .single();

        if (error) throw error;
        triggerId = data.id;
      }

      // Save conditions
      if (triggerId) {
        // Delete existing conditions
        await supabase
          .from('workflow_conditions')
          .delete()
          .eq('trigger_id', triggerId);

        // Insert new conditions
        if (workflow.conditions.length > 0) {
          const { error: conditionsError } = await supabase
            .from('workflow_conditions')
            .insert(
              workflow.conditions.map((condition, index) => ({
                ...condition,
                trigger_id: triggerId,
                condition_order: index
              }))
            );

          if (conditionsError) throw conditionsError;
        }

        // Save actions
        await supabase
          .from('workflow_actions')
          .delete()
          .eq('trigger_id', triggerId);

        if (workflow.actions.length > 0) {
          const { error: actionsError } = await supabase
            .from('workflow_actions')
            .insert(
              workflow.actions.map((action, index) => ({
                ...action,
                trigger_id: triggerId,
                action_order: index
              }))
            );

          if (actionsError) throw actionsError;
        }
      }

      toast({
        title: 'Success',
        description: `Workflow ${workflowId ? 'updated' : 'created'} successfully`
      });

      onClose();
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to save workflow',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addCondition = () => {
    setWorkflow(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        condition_type: 'field_equals',
        field_name: '',
        operator: 'equals',
        condition_value: {},
        logical_operator: 'AND'
      }]
    }));
  };

  const removeCondition = (index: number) => {
    setWorkflow(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const updateCondition = (index: number, updatedCondition: any) => {
    setWorkflow(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? updatedCondition : condition
      )
    }));
  };

  const addAction = () => {
    setWorkflow(prev => ({
      ...prev,
      actions: [...prev.actions, {
        action_type: 'send_notification',
        action_config: {},
        delay_minutes: 0
      }]
    }));
  };

  const removeAction = (index: number) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const updateAction = (index: number, updatedAction: any) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions.map((action, i) => 
        i === index ? updatedAction : action
      )
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-muted rounded w-1/3"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {workflowId ? 'Edit Workflow' : 'Create Workflow'}
            </h1>
            <p className="text-muted-foreground">
              Build automated workflows for your work orders
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveWorkflow} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Configure the basic workflow settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                value={workflow.name}
                onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Auto-assign high priority orders"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={workflow.description}
                onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this workflow does..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger_type">Trigger Type *</Label>
              <Select
                value={workflow.trigger_type}
                onValueChange={(value) => setWorkflow(prev => ({ ...prev, trigger_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Conditions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Conditions
                </CardTitle>
                <CardDescription>
                  Define when this workflow should trigger
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addCondition}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflow.conditions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conditions defined</p>
                <p className="text-sm">Add conditions to control when this workflow runs</p>
              </div>
            ) : (
              workflow.conditions.map((condition, index) => (
                <div key={index} className="space-y-2">
                  {index > 0 && (
                    <div className="flex items-center gap-2">
                      <Separator className="flex-1" />
                      <Badge variant="outline">{condition.logical_operator}</Badge>
                      <Separator className="flex-1" />
                    </div>
                  )}
                  <WorkflowConditionBuilder
                    condition={condition}
                    onChange={(updatedCondition) => updateCondition(index, updatedCondition)}
                    onRemove={() => removeCondition(index)}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Actions
                </CardTitle>
                <CardDescription>
                  Define what happens when triggered
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {workflow.actions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No actions defined</p>
                <p className="text-sm">Add actions to automate work order processes</p>
              </div>
            ) : (
              workflow.actions.map((action, index) => (
                <WorkflowActionBuilder
                  key={index}
                  action={action}
                  onChange={(updatedAction) => updateAction(index, updatedAction)}
                  onRemove={() => removeAction(index)}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}