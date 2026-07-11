import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle, Clock, Users } from 'lucide-react';
import { useEscalationRules } from '@/hooks/workflows/useEscalationRules';

interface EscalationRuleBuilderProps {
  rule?: any;
  onSave: () => void;
  onCancel: () => void;
}

export function EscalationRuleBuilder({ rule, onSave, onCancel }: EscalationRuleBuilderProps) {
  const { createEscalationRule, updateEscalationRule } = useEscalationRules();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    trigger_condition: rule?.trigger_condition || 'overdue_work_order',
    trigger_config: rule?.trigger_config || { initial_hours: 24, check_interval: 60 },
    escalation_steps: rule?.escalation_steps || [
      {
        step: 1,
        delay_hours: 0,
        action: 'notify',
        recipients: ['assigned_technician'],
        message: 'Work order {{work_order_number}} is overdue. Please provide status update.',
        channels: ['email']
      }
    ]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (rule) {
        await updateEscalationRule(rule.id, formData);
      } else {
        await createEscalationRule({
          ...formData,
          is_active: true
        });
      }
      onSave();
    } catch (error) {
      console.error('Error saving escalation rule:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEscalationStep = () => {
    const nextStep = formData.escalation_steps.length + 1;
    setFormData(prev => ({
      ...prev,
      escalation_steps: [...prev.escalation_steps, {
        step: nextStep,
        delay_hours: 4,
        action: 'notify',
        recipients: ['supervisor'],
        message: `Escalation step ${nextStep} triggered.`,
        channels: ['email']
      }]
    }));
  };

  const updateEscalationStep = (index: number, updates: any) => {
    setFormData(prev => ({
      ...prev,
      escalation_steps: prev.escalation_steps.map((step, i) => 
        i === index ? { ...step, ...updates } : step
      )
    }));
  };

  const removeEscalationStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      escalation_steps: prev.escalation_steps.filter((_, i) => i !== index)
        .map((step, i) => ({ ...step, step: i + 1 }))
    }));
  };

  const handleChannelChange = (stepIndex: number, channel: string, checked: boolean) => {
    updateEscalationStep(stepIndex, {
      channels: checked 
        ? [...formData.escalation_steps[stepIndex].channels, channel]
        : formData.escalation_steps[stepIndex].channels.filter((c: string) => c !== channel)
    });
  };

  const handleRecipientChange = (stepIndex: number, recipient: string, checked: boolean) => {
    updateEscalationStep(stepIndex, {
      recipients: checked 
        ? [...formData.escalation_steps[stepIndex].recipients, recipient]
        : formData.escalation_steps[stepIndex].recipients.filter((r: string) => r !== recipient)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">
          {rule ? 'Edit Escalation Rule' : 'Create Escalation Rule'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Configure the escalation rule details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Overdue Work Order Escalation"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the escalation process..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trigger Configuration</CardTitle>
            <CardDescription>Define when the escalation should start</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trigger_condition">Trigger Condition</Label>
                <Select
                  value={formData.trigger_condition}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_condition: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overdue_work_order">Overdue Work Order</SelectItem>
                    <SelectItem value="status_stuck">Status Stuck</SelectItem>
                    <SelectItem value="no_response">No Customer Response</SelectItem>
                    <SelectItem value="quality_issue">Quality Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_hours">Initial Trigger (hours)</Label>
                <Input
                  id="initial_hours"
                  type="number"
                  min="1"
                  value={formData.trigger_config.initial_hours}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    trigger_config: {
                      ...prev.trigger_config,
                      initial_hours: parseInt(e.target.value) || 24
                    }
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_interval">Check Interval (minutes)</Label>
              <Input
                id="check_interval"
                type="number"
                min="15"
                value={formData.trigger_config.check_interval}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  trigger_config: {
                    ...prev.trigger_config,
                    check_interval: parseInt(e.target.value) || 60
                  }
                }))}
                placeholder="60"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalation Steps</CardTitle>
            <CardDescription>Configure the escalation chain and actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formData.escalation_steps.map((step, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <h4 className="font-semibold">Step {step.step}</h4>
                  </div>
                  {formData.escalation_steps.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEscalationStep(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Delay (hours)</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <Input
                        type="number"
                        min="0"
                        value={step.delay_hours}
                        onChange={(e) => updateEscalationStep(index, { 
                          delay_hours: parseInt(e.target.value) || 0 
                        })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={step.action}
                      onValueChange={(value) => updateEscalationStep(index, { action: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notify">Send Notification</SelectItem>
                        <SelectItem value="reassign">Reassign Work Order</SelectItem>
                        <SelectItem value="call">Schedule Call</SelectItem>
                        <SelectItem value="escalate">Escalate to Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'assigned_technician',
                      'supervisor',
                      'manager',
                      'service_advisor',
                      'owner'
                    ].map((recipient) => (
                      <div key={recipient} className="flex items-center space-x-2">
                        <Checkbox
                          checked={step.recipients.includes(recipient)}
                          onCheckedChange={(checked) => 
                            handleRecipientChange(index, recipient, checked as boolean)
                          }
                        />
                        <Label className="text-sm capitalize">
                          {recipient.replace('_', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={step.message}
                    onChange={(e) => updateEscalationStep(index, { message: e.target.value })}
                    placeholder="Message to send in this escalation step..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Delivery Channels</Label>
                  <div className="flex gap-4">
                    {['email', 'sms', 'in_app'].map((channel) => (
                      <div key={channel} className="flex items-center space-x-2">
                        <Checkbox
                          checked={step.channels.includes(channel)}
                          onCheckedChange={(checked) => 
                            handleChannelChange(index, channel, checked as boolean)
                          }
                        />
                        <Label className="text-sm capitalize">{channel.replace('_', '-')}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addEscalationStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Escalation Step
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Escalation Rule'}
          </Button>
        </div>
      </form>
    </div>
  );
}