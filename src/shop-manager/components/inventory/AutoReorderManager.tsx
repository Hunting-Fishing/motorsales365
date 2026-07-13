import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAutomatedReordering } from '@/hooks/inventory/useAutomatedReordering';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings, 
  Play, 
  X, 
  TrendingDown,
  Package,
  Zap,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export function AutoReorderManager() {
  const {
    reorderAlerts,
    autoReorderRules,
    insights,
    isLoading,
    isSaving,
    isExecuting,
    saveReorderRule,
    executeAutoReorder,
    dismissAlert
  } = useAutomatedReordering();

  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      default:
        return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSaveRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItemId) return;

    const formData = new FormData(e.currentTarget);
    
    try {
      await saveReorderRule({
        itemId: selectedItemId,
        enabled: formData.get('enabled') === 'on',
        reorderPoint: Number(formData.get('reorderPoint')),
        reorderQuantity: Number(formData.get('reorderQuantity')),
        maxStock: Number(formData.get('maxStock')),
        leadTimeDays: Number(formData.get('leadTimeDays')),
        seasonalMultiplier: Number(formData.get('seasonalMultiplier')) || 1.0
      });
      
      setIsRuleDialogOpen(false);
      setSelectedItemId(null);
    } catch (error) {
      console.error('Failed to save reorder rule:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insights Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold">{insights.totalAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-red-600">{insights.highPriorityAlerts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Value</p>
                <p className="text-2xl font-bold">${insights.estimatedReorderValue.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Automation Coverage</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{insights.automationCoverage.toFixed(0)}%</p>
                  <Progress value={insights.automationCoverage} className="w-16 h-2" />
                </div>
              </div>
              <Zap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={executeAutoReorder}
          disabled={isExecuting}
          className="flex items-center gap-2"
          size="lg"
        >
          <Play className="h-4 w-4" />
          {isExecuting ? 'Executing...' : 'Execute Auto Reordering'}
        </Button>
        
        <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="lg" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configure Rules
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Auto-Reorder Rule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enabled">Enable Auto-Reordering</Label>
                <Switch id="enabled" name="enabled" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    name="reorderPoint"
                    type="number"
                    min="0"
                    placeholder="10"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
                  <Input
                    id="reorderQuantity"
                    name="reorderQuantity"
                    type="number"
                    min="1"
                    placeholder="50"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxStock">Max Stock Level</Label>
                  <Input
                    id="maxStock"
                    name="maxStock"
                    type="number"
                    min="1"
                    placeholder="100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
                  <Input
                    id="leadTimeDays"
                    name="leadTimeDays"
                    type="number"
                    min="1"
                    placeholder="7"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="seasonalMultiplier">Seasonal Multiplier</Label>
                <Input
                  id="seasonalMultiplier"
                  name="seasonalMultiplier"
                  type="number"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  placeholder="1.0"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRuleDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Rule'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reorder Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Reorder Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Suggested Qty</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Est. Stockout</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reorderAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <p className="text-muted-foreground">No reorder alerts at this time</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reorderAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.itemName}</TableCell>
                    <TableCell>
                      <span className={alert.currentStock === 0 ? 'text-red-600 font-semibold' : ''}>
                        {alert.currentStock}
                      </span>
                    </TableCell>
                    <TableCell>{alert.reorderPoint}</TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {alert.suggestedQuantity}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(alert.priority)}>
                        <div className="flex items-center gap-1">
                          {getPriorityIcon(alert.priority)}
                          {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(alert.estimatedStockoutDate), 'MMM dd')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedItemId(alert.itemId);
                            setIsRuleDialogOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Auto-Reorder Rules Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Active Auto-Reorder Rules ({insights.activeRules})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {autoReorderRules.filter(rule => rule.enabled).map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Item {rule.itemId}</span>
                  <Switch checked={rule.enabled} disabled />
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Reorder at: {rule.reorderPoint} units</p>
                  <p>Order quantity: {rule.reorderQuantity} units</p>
                  <p>Lead time: {rule.leadTimeDays} days</p>
                </div>
              </div>
            ))}
            
            {insights.activeRules === 0 && (
              <div className="col-span-full text-center py-8">
                <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No active auto-reorder rules configured</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}