
import { useState, useEffect } from 'react';
import { 
  Card, CardContent, CardDescription, 
  CardHeader, CardTitle, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, RefreshCw } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SegmentBuilderProps {
  segmentId?: string;
  onSave?: (segment: any) => void;
}

export const SegmentBuilder = ({ segmentId, onSave }: SegmentBuilderProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [segmentType, setSegmentType] = useState('behavioral');
  const [rules, setRules] = useState<any[]>([{ 
    id: 'rule-' + Date.now(),
    rule_type: 'customer_property', 
    rule_operator: 'equals', 
    rule_value: '' 
  }]);
  
  useEffect(() => {
    // If editing an existing segment, load its data
    if (segmentId) {
      const fetchSegment = async () => {
        setLoading(true);
        try {
          // Fetch segment
          const { data: segment, error: segmentError } = await supabase
            .from('marketing_segments')
            .select('*')
            .eq('id', segmentId)
            .single();
            
          if (segmentError) throw segmentError;
          
          if (segment) {
            setSegmentName(segment.name);
            setSegmentDescription(segment.description || '');
            setSegmentType(segment.segment_type);
            
            // Fetch rules for this segment
            const { data: segmentRules, error: rulesError } = await supabase
              .from('segment_rules')
              .select('*')
              .eq('segment_id', segmentId);
              
            if (rulesError) throw rulesError;
            
            if (segmentRules && segmentRules.length > 0) {
              setRules(segmentRules.map(rule => ({
                id: rule.id,
                rule_type: rule.rule_type,
                rule_operator: rule.rule_operator,
                rule_value: rule.rule_value
              })));
            }
          }
        } catch (err) {
          console.error('Error loading segment:', err);
          toast({
            title: 'Error',
            description: 'Failed to load segment data',
            variant: 'destructive'
          });
        } finally {
          setLoading(false);
        }
      };
      
      fetchSegment();
    }
  }, [segmentId, toast]);
  
  const addRule = () => {
    setRules([...rules, { 
      id: 'rule-' + Date.now(),
      rule_type: 'customer_property', 
      rule_operator: 'equals', 
      rule_value: '' 
    }]);
  };
  
  const updateRule = (index: number, field: string, value: string) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };
  
  const removeRule = (index: number) => {
    const newRules = [...rules];
    newRules.splice(index, 1);
    setRules(newRules);
  };
  
  const handleSave = async () => {
    if (!segmentName) {
      toast({
        title: 'Validation Error',
        description: 'Segment name is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (rules.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one rule is required',
        variant: 'destructive'
      });
      return;
    }
    
    for (const rule of rules) {
      if (!rule.rule_value) {
        toast({
          title: 'Validation Error',
          description: 'All rules must have values',
          variant: 'destructive'
        });
        return;
      }
    }
    
    setSaving(true);
    try {
      let segmentResult;
      
      if (segmentId) {
        // Update existing segment
        const { data, error } = await supabase
          .from('marketing_segments')
          .update({
            name: segmentName,
            description: segmentDescription,
            segment_type: segmentType,
            updated_at: new Date().toISOString()
          })
          .eq('id', segmentId)
          .select()
          .single();
          
        if (error) throw error;
        segmentResult = data;
        
        // Delete existing rules and create new ones
        await supabase
          .from('segment_rules')
          .delete()
          .eq('segment_id', segmentId);
      } else {
        // Create new segment
        const { data, error } = await supabase
          .from('marketing_segments')
          .insert({
            name: segmentName,
            description: segmentDescription,
            segment_type: segmentType
          })
          .select()
          .single();
          
        if (error) throw error;
        segmentResult = data;
      }
      
      // Create rules
      const rulesData = rules.map(rule => ({
        segment_id: segmentResult.id,
        rule_type: rule.rule_type,
        rule_operator: rule.rule_operator,
        rule_value: rule.rule_value
      }));
      
      const { error: rulesError } = await supabase
        .from('segment_rules')
        .insert(rulesData);
        
      if (rulesError) throw rulesError;
      
      toast({
        title: 'Success',
        description: segmentId ? 'Segment updated successfully' : 'Segment created successfully'
      });
      
      if (onSave) {
        onSave(segmentResult);
      }
    } catch (err) {
      console.error('Error saving segment:', err);
      toast({
        title: 'Error',
        description: 'Failed to save segment',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div>Loading segment data...</div>;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{segmentId ? 'Edit Segment' : 'Create Segment'}</CardTitle>
        <CardDescription>
          Define your customer segment using rules below
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="segmentName">Segment Name</Label>
            <Input 
              id="segmentName"
              value={segmentName}
              onChange={(e) => setSegmentName(e.target.value)}
              placeholder="High Value Customers" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="segmentType">Segment Type</Label>
            <Select 
              value={segmentType} 
              onValueChange={setSegmentType}
            >
              <SelectTrigger id="segmentType">
                <SelectValue placeholder="Select segment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="demographic">Demographic</SelectItem>
                <SelectItem value="engagement">Engagement</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="segmentDescription">Description (Optional)</Label>
          <Input 
            id="segmentDescription"
            value={segmentDescription}
            onChange={(e) => setSegmentDescription(e.target.value)}
            placeholder="Customers who..." 
          />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Segment Rules</Label>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addRule}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Rule
            </Button>
          </div>
          
          {rules.length === 0 ? (
            <div className="text-center py-4 border rounded-md">
              <p className="text-sm text-muted-foreground">
                No rules defined. Add a rule to define this segment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={rule.id || index} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Field</Label>
                    <Select 
                      value={rule.rule_type} 
                      onValueChange={(value) => updateRule(index, 'rule_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer_property">Customer Property</SelectItem>
                        <SelectItem value="last_purchase">Last Purchase</SelectItem>
                        <SelectItem value="total_spent">Total Spent</SelectItem>
                        <SelectItem value="email_engagement">Email Engagement</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="custom_field">Custom Field</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Label className="text-xs">Operator</Label>
                    <Select 
                      value={rule.rule_operator} 
                      onValueChange={(value) => updateRule(index, 'rule_operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="before">Before</SelectItem>
                        <SelectItem value="after">After</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1">
                    <Label className="text-xs">Value</Label>
                    <Input 
                      value={rule.rule_value}
                      onChange={(e) => updateRule(index, 'rule_value', e.target.value)}
                      placeholder="Value"
                    />
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeRule(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={addRule}>
          Add Rule
        </Button>
        <div className="flex gap-2">
          {segmentId && (
            <Button variant="outline" disabled={saving}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Members
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Segment
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
