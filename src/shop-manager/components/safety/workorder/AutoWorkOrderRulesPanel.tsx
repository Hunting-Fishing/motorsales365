import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Wrench, Plus, Trash2, AlertTriangle, 
  AlertCircle, XCircle 
} from 'lucide-react';
import { useAutoWorkOrderRules, WorkOrderRule } from '@/hooks/useAutoWorkOrderRules';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function AutoWorkOrderRulesPanel() {
  const { rules, loading, createRule, updateRule, deleteRule } = useAutoWorkOrderRules();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    inspection_type: 'vessel',
    trigger_status: 'bad',
    work_order_priority: 'medium',
    assign_to_role: '',
    notes_template: '',
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attention':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'bad':
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      low: 'secondary',
      medium: 'outline',
      high: 'default',
      critical: 'destructive',
    };
    return <Badge variant={variants[priority] || 'outline'}>{priority}</Badge>;
  };

  const handleCreate = async () => {
    await createRule(newRule);
    setDialogOpen(false);
    setNewRule({
      inspection_type: 'vessel',
      trigger_status: 'bad',
      work_order_priority: 'medium',
      assign_to_role: '',
      notes_template: '',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Auto Work Order Rules
          </CardTitle>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No auto work order rules configured
            </p>
          ) : (
            rules.map(rule => (
              <div 
                key={rule.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(rule.trigger_status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {rule.inspection_type}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="capitalize">{rule.trigger_status}</span>
                      {getPriorityBadge(rule.work_order_priority)}
                    </div>
                    {rule.assign_to_role && (
                      <p className="text-sm text-muted-foreground">
                        Assign to: {rule.assign_to_role}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => 
                      updateRule(rule.id, { is_active: checked })
                    }
                  />
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Auto Work Order Rule</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inspection Type</Label>
                <Select
                  value={newRule.inspection_type}
                  onValueChange={(v) => setNewRule({ ...newRule, inspection_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vessel">Vessel</SelectItem>
                    <SelectItem value="forklift">Forklift</SelectItem>
                    <SelectItem value="dvir">DVIR</SelectItem>
                    <SelectItem value="daily_shop">Daily Shop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Trigger When Status Is</Label>
                <Select
                  value={newRule.trigger_status}
                  onValueChange={(v) => setNewRule({ ...newRule, trigger_status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attention">Attention (Yellow)</SelectItem>
                    <SelectItem value="bad">Bad (Red)</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Work Order Priority</Label>
                <Select
                  value={newRule.work_order_priority}
                  onValueChange={(v) => setNewRule({ ...newRule, work_order_priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign to Role (Optional)</Label>
                <Input
                  placeholder="e.g., lead_mechanic"
                  value={newRule.assign_to_role}
                  onChange={(e) => setNewRule({ ...newRule, assign_to_role: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes Template (Optional)</Label>
              <Textarea
                placeholder="Template for work order notes..."
                value={newRule.notes_template}
                onChange={(e) => setNewRule({ ...newRule, notes_template: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>
                Create Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
