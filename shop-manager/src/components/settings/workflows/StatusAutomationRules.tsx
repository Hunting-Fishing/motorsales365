import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Settings,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Timer,
  Plus,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StatusRule {
  id: string;
  name: string;
  fromStatus: string;
  toStatus: string;
  trigger: 'time' | 'condition' | 'dependency';
  isActive: boolean;
  conditions: {
    type: string;
    value: string;
    operator: string;
  }[];
  delay?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
}

const workOrderStatuses = [
  'pending',
  'in_progress',
  'waiting_parts',
  'quality_check',
  'completed',
  'cancelled'
];

const predefinedRules: StatusRule[] = [
  {
    id: '1',
    name: 'Auto-start after assignment',
    fromStatus: 'pending',
    toStatus: 'in_progress',
    trigger: 'condition',
    isActive: true,
    conditions: [
      { type: 'technician_assigned', value: 'true', operator: 'equals' }
    ]
  },
  {
    id: '2',
    name: 'Complete after 24h in QC',
    fromStatus: 'quality_check',
    toStatus: 'completed',
    trigger: 'time',
    isActive: true,
    conditions: [],
    delay: 24,
    delayUnit: 'hours'
  },
  {
    id: '3',
    name: 'Auto-complete when all parts received',
    fromStatus: 'waiting_parts',
    toStatus: 'in_progress',
    trigger: 'condition',
    isActive: false,
    conditions: [
      { type: 'parts_received', value: '100', operator: 'greater_than_equal' }
    ]
  }
];

export function StatusAutomationRules() {
  const [rules, setRules] = useState<StatusRule[]>(predefinedRules);
  const [showNewRule, setShowNewRule] = useState(false);
  const { toast } = useToast();

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, isActive: !rule.isActive }
        : rule
    ));
    
    toast({
      title: 'Rule Updated',
      description: 'Status automation rule has been updated'
    });
  };

  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
    toast({
      title: 'Rule Deleted',
      description: 'Status automation rule has been removed'
    });
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'time': return <Clock className="h-4 w-4" />;
      case 'condition': return <Settings className="h-4 w-4" />;
      case 'dependency': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTriggerColor = (trigger: string) => {
    switch (trigger) {
      case 'time': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'condition': return 'bg-green-100 text-green-800 border-green-200';
      case 'dependency': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            Status Automation Rules
          </h3>
          <p className="text-sm text-muted-foreground">
            Automatically transition work order statuses based on conditions
          </p>
        </div>
        <Button onClick={() => setShowNewRule(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Active Rules */}
      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className={`transition-all ${rule.isActive ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                  <div>
                    <CardTitle className="text-base">{rule.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {rule.fromStatus}
                      </Badge>
                      <ArrowRight className="h-3 w-3" />
                      <Badge variant="outline" className="text-xs">
                        {rule.toStatus}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getTriggerColor(rule.trigger)}`}>
                    {getTriggerIcon(rule.trigger)}
                    <span className="ml-1 capitalize">{rule.trigger}</span>
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {rule.trigger === 'time' && rule.delay && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    <span>Triggers after {rule.delay} {rule.delayUnit}</span>
                  </div>
                )}
                {rule.conditions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Conditions:</span>
                    {rule.conditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground ml-4">
                        <span>•</span>
                        <span>{condition.type} {condition.operator} {condition.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Setup Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Setup Templates</CardTitle>
          <CardDescription>
            Common automation patterns to get you started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Auto-Complete Template</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically mark work orders as complete when all tasks are done
              </p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">SLA Enforcement</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Escalate overdue work orders based on priority levels
              </p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Parts Availability</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Move to waiting status when parts are unavailable
              </p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <Play className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Workflow Chain</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Create sequential status transitions with dependencies
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automation Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">24</div>
              <div className="text-sm text-muted-foreground">Rules Executed Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">156</div>
              <div className="text-sm text-muted-foreground">Auto-Transitions This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">98%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">3.2h</div>
              <div className="text-sm text-muted-foreground">Time Saved</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}