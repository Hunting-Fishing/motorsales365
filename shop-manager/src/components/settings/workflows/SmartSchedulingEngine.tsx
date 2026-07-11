import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Zap,
  Settings,
  Brain,
  Target,
  BarChart3,
  UserCheck
} from 'lucide-react';

interface SchedulingRule {
  id: string;
  name: string;
  type: 'workload' | 'skills' | 'priority' | 'sla';
  isEnabled: boolean;
  weight: number;
  description: string;
}

const schedulingRules: SchedulingRule[] = [
  {
    id: '1',
    name: 'Workload Balancing',
    type: 'workload',
    isEnabled: true,
    weight: 80,
    description: 'Distribute work evenly across available technicians'
  },
  {
    id: '2',
    name: 'Skill Matching',
    type: 'skills',
    isEnabled: true,
    weight: 90,
    description: 'Match work orders to technicians with relevant skills'
  },
  {
    id: '3',
    name: 'Priority Optimization',
    type: 'priority',
    isEnabled: true,
    weight: 70,
    description: 'Prioritize high-priority and emergency work orders'
  },
  {
    id: '4',
    name: 'SLA Compliance',
    type: 'sla',
    isEnabled: false,
    weight: 95,
    description: 'Ensure work orders meet service level agreements'
  }
];

export function SmartSchedulingEngine() {
  const [rules, setRules] = useState<SchedulingRule[]>(schedulingRules);
  const [autoScheduling, setAutoScheduling] = useState(true);
  const [optimizationLevel, setOptimizationLevel] = useState([75]);

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, isEnabled: !rule.isEnabled }
        : rule
    ));
  };

  const updateWeight = (ruleId: string, weight: number) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, weight }
        : rule
    ));
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'workload': return <Users className="h-4 w-4" />;
      case 'skills': return <Target className="h-4 w-4" />;
      case 'priority': return <TrendingUp className="h-4 w-4" />;
      case 'sla': return <Clock className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getRuleColor = (type: string) => {
    switch (type) {
      case 'workload': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'skills': return 'bg-green-100 text-green-800 border-green-200';
      case 'priority': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'sla': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Smart Scheduling Engine
          </h3>
          <p className="text-sm text-muted-foreground">
            AI-powered work order assignment and scheduling optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="auto-scheduling">Auto-Scheduling</Label>
          <Switch
            id="auto-scheduling"
            checked={autoScheduling}
            onCheckedChange={setAutoScheduling}
          />
        </div>
      </div>

      {/* Optimization Level */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Optimization Level
          </CardTitle>
          <CardDescription>
            Balance between scheduling speed and optimization quality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Performance</span>
              <span className="text-sm">Quality</span>
            </div>
            <Slider
              value={optimizationLevel}
              onValueChange={setOptimizationLevel}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
            <div className="text-center">
              <Badge variant="outline">
                Level {optimizationLevel[0]}% - {optimizationLevel[0] < 50 ? 'Fast' : optimizationLevel[0] < 80 ? 'Balanced' : 'Premium'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Rules */}
      <div className="space-y-4">
        <h4 className="font-medium">Scheduling Rules & Weights</h4>
        {rules.map((rule) => (
          <Card key={rule.id} className={`transition-all ${rule.isEnabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Switch
                      checked={rule.isEnabled}
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getRuleColor(rule.type)}`}>
                          {getRuleIcon(rule.type)}
                          <span className="ml-1 capitalize">{rule.type}</span>
                        </Badge>
                        <span className="font-medium">{rule.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{rule.weight}%</div>
                    <div className="text-xs text-muted-foreground">Weight</div>
                  </div>
                </div>
                
                {rule.isEnabled && (
                  <div className="space-y-2">
                    <Label className="text-xs">Priority Weight: {rule.weight}%</Label>
                    <Slider
                      value={[rule.weight]}
                      onValueChange={(value) => updateWeight(rule.id, value[0])}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Advanced Scheduling Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="batch-scheduling">Batch Scheduling</Label>
                <Switch id="batch-scheduling" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="overtime-consideration">Consider Overtime</Label>
                <Switch id="overtime-consideration" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="customer-preferences">Customer Preferences</Label>
                <Switch id="customer-preferences" defaultChecked />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="travel-optimization">Travel Optimization</Label>
                <Switch id="travel-optimization" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="emergency-override">Emergency Override</Label>
                <Switch id="emergency-override" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="learning-mode">ML Learning Mode</Label>
                <Switch id="learning-mode" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Scheduling Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-green-600">94%</div>
              <div className="text-sm text-muted-foreground">Assignment Accuracy</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-blue-600">2.3h</div>
              <div className="text-sm text-muted-foreground">Avg. Schedule Time</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-purple-600">87%</div>
              <div className="text-sm text-muted-foreground">Technician Utilization</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold text-orange-600">12%</div>
              <div className="text-sm text-muted-foreground">Time Saved</div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>High Priority SLA Compliance</span>
              <span className="font-medium">98%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Workload Balance Score</span>
              <span className="font-medium">92%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Skill Match Accuracy</span>
              <span className="font-medium">89%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          View Schedule
        </Button>
        <Button variant="outline">
          <UserCheck className="h-4 w-4 mr-2" />
          Technician Workload
        </Button>
        <Button>
          <Zap className="h-4 w-4 mr-2" />
          Optimize Now
        </Button>
      </div>
    </div>
  );
}