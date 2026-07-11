
import React, { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface AutomationRuleBuilderProps {
  ruleId?: string;
  onSave?: (rule: any) => void;
}

export const AutomationRuleBuilder = ({ ruleId, onSave }: AutomationRuleBuilderProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [triggerType, setTriggerType] = useState('event');
  const [triggerCriteria, setTriggerCriteria] = useState<any>({
    event_type: 'purchase',
    conditions: []
  });
  
  const [actionType, setActionType] = useState('send_email');
  const [actionDetails, setActionDetails] = useState<any>({
    template_id: '',
    delay_hours: 0
  });
  
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [segments, setSegments] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch email templates
        const { data: templates, error: templatesError } = await supabase
          .from('email_templates')
          .select('id, name')
          .eq('is_archived', false)
          .order('name');
          
        if (templatesError) throw templatesError;
        setEmailTemplates(templates || []);
        
        // Fetch customer segments
        const { data: segmentData, error: segmentsError } = await supabase
          .from('marketing_segments')
          .select('id, name')
          .order('name');
          
        if (segmentsError) throw segmentsError;
        setSegments(segmentData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        toast({
          title: 'Error',
          description: 'Failed to load necessary data',
          variant: 'destructive'
        });
      }
    };
    
    fetchData();
  }, [toast]);
  
  useEffect(() => {
    // If editing existing rule, load data
    if (ruleId) {
      const fetchRule = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('marketing_automation_rules')
            .select('*')
            .eq('id', ruleId)
            .single();
            
          if (error) throw error;
          
          if (data) {
            setName(data.name);
            setDescription(data.description || '');
            setIsActive(data.is_active);
            setTriggerType(data.trigger_type);
            setTriggerCriteria(data.trigger_criteria || {});
            setActionType(data.action_type);
            setActionDetails(data.action_details || {});
          }
        } catch (err) {
          console.error('Error loading automation rule:', err);
          toast({
            title: 'Error',
            description: 'Failed to load automation rule data',
            variant: 'destructive'
          });
        } finally {
          setLoading(false);
        }
      };
      
      fetchRule();
    }
  }, [ruleId, toast]);
  
  const handleTriggerChange = (field: string, value: any) => {
    setTriggerCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleActionChange = (field: string, value: any) => {
    setActionDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSave = async () => {
    if (!name) {
      toast({
        title: 'Validation Error',
        description: 'Rule name is required',
        variant: 'destructive'
      });
      return;
    }
    
    setSaving(true);
    try {
      const ruleData = {
        name,
        description,
        is_active: isActive,
        trigger_type: triggerType,
        trigger_criteria: triggerCriteria,
        action_type: actionType,
        action_details: actionDetails
      };
      
      let result;
      
      if (ruleId) {
        // Update existing rule
        const { data, error } = await supabase
          .from('marketing_automation_rules')
          .update(ruleData)
          .eq('id', ruleId)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Create new rule
        const { data, error } = await supabase
          .from('marketing_automation_rules')
          .insert(ruleData)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      toast({
        title: 'Success',
        description: ruleId ? 'Automation rule updated successfully' : 'Automation rule created successfully'
      });
      
      if (onSave) {
        onSave(result);
      }
    } catch (err) {
      console.error('Error saving automation rule:', err);
      toast({
        title: 'Error',
        description: 'Failed to save automation rule',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div>Loading automation rule data...</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{ruleId ? 'Edit Automation Rule' : 'Create Automation Rule'}</CardTitle>
            <CardDescription>
              Create an automated marketing action based on customer behavior
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="rule-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="rule-active">Active</Label>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input 
                id="ruleName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Welcome Email Sequence" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea 
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="This rule sends..." 
                rows={2}
              />
            </div>
          </div>
          
          <Tabs defaultValue="trigger" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trigger">Trigger</TabsTrigger>
              <TabsTrigger value="action">Action</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trigger" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select 
                  value={triggerType} 
                  onValueChange={setTriggerType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="segment_entry">Segment Entry</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="property_change">Property Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {triggerType === 'event' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select 
                      value={triggerCriteria.event_type || 'purchase'} 
                      onValueChange={(value) => handleTriggerChange('event_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="email_open">Email Open</SelectItem>
                        <SelectItem value="email_click">Email Click</SelectItem>
                        <SelectItem value="form_submission">Form Submission</SelectItem>
                        <SelectItem value="website_visit">Website Visit</SelectItem>
                        <SelectItem value="custom">Custom Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {triggerCriteria.event_type === 'custom' && (
                    <div className="space-y-2">
                      <Label>Custom Event Name</Label>
                      <Input 
                        value={triggerCriteria.custom_event_name || ''}
                        onChange={(e) => handleTriggerChange('custom_event_name', e.target.value)}
                        placeholder="my_custom_event" 
                      />
                    </div>
                  )}
                </div>
              )}
              
              {triggerType === 'segment_entry' && (
                <div className="space-y-2">
                  <Label>Segment</Label>
                  <Select 
                    value={triggerCriteria.segment_id || ''} 
                    onValueChange={(value) => handleTriggerChange('segment_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a segment" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map(segment => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {triggerType === 'date' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date Field</Label>
                    <Select 
                      value={triggerCriteria.date_field || 'created_at'} 
                      onValueChange={(value) => handleTriggerChange('date_field', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Account Creation Date</SelectItem>
                        <SelectItem value="birthday">Birthday</SelectItem>
                        <SelectItem value="last_purchase">Last Purchase Date</SelectItem>
                        <SelectItem value="custom_date">Custom Date Field</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Days {triggerCriteria.offset_type || 'before'}</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number"
                        value={triggerCriteria.days_offset || 0}
                        onChange={(e) => handleTriggerChange('days_offset', parseInt(e.target.value) || 0)}
                        className="w-24" 
                      />
                      <Select 
                        value={triggerCriteria.offset_type || 'before'} 
                        onValueChange={(value) => handleTriggerChange('offset_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="before">Before</SelectItem>
                          <SelectItem value="after">After</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="action" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select 
                  value={actionType} 
                  onValueChange={setActionType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_email">Send Email</SelectItem>
                    <SelectItem value="add_to_segment">Add to Segment</SelectItem>
                    <SelectItem value="remove_from_segment">Remove from Segment</SelectItem>
                    <SelectItem value="enroll_in_sequence">Enroll in Sequence</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {actionType === 'send_email' && (
                <>
                  <div className="space-y-2">
                    <Label>Email Template</Label>
                    <Select 
                      value={actionDetails.template_id || ''} 
                      onValueChange={(value) => handleActionChange('template_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Delay (hours)</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={actionDetails.delay_hours || 0}
                      onChange={(e) => handleActionChange('delay_hours', parseInt(e.target.value) || 0)}
                      className="w-24" 
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to 0 for immediate sending
                    </p>
                  </div>
                </>
              )}
              
              {(actionType === 'add_to_segment' || actionType === 'remove_from_segment') && (
                <div className="space-y-2">
                  <Label>Target Segment</Label>
                  <Select 
                    value={actionDetails.segment_id || ''} 
                    onValueChange={(value) => handleActionChange('segment_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a segment" />
                    </SelectTrigger>
                    <SelectContent>
                      {segments.map(segment => (
                        <SelectItem key={segment.id} value={segment.id}>
                          {segment.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {actionType === 'webhook' && (
                <>
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input 
                      value={actionDetails.webhook_url || ''}
                      onChange={(e) => handleActionChange('webhook_url', e.target.value)}
                      placeholder="https://..." 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>HTTP Method</Label>
                    <Select 
                      value={actionDetails.http_method || 'POST'} 
                      onValueChange={(value) => handleActionChange('http_method', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Request Body</Label>
                    <Textarea 
                      value={actionDetails.request_body || ''}
                      onChange={(e) => handleActionChange('request_body', e.target.value)}
                      placeholder='{"key": "{{customer.id}}"}' 
                    />
                    <p className="text-xs text-muted-foreground">
                      Use &#123;&#123;variable&#125;&#125; syntax for dynamic values
                    </p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : (ruleId ? 'Update Rule' : 'Create Rule')}
        </Button>
      </CardFooter>
    </Card>
  );
};
