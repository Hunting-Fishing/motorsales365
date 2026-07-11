import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { supabase } from '@/integrations/supabase/client';
import { 
  CircleDot, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  ArrowUp, 
  ArrowDown,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface WorkOrderStatus {
  id: string;
  name: string;
  label: string;
  color: string;
  icon: string;
  order: number;
  is_active: boolean;
  is_default: boolean;
  is_closed: boolean;
  is_billable: boolean;
  requires_approval: boolean;
  auto_assign: boolean;
  send_notifications: boolean;
  description?: string;
}

const STATUS_ICONS = [
  { value: 'clock', label: 'Clock', icon: Clock },
  { value: 'play', label: 'Play', icon: Play },
  { value: 'pause', label: 'Pause', icon: Pause },
  { value: 'check-circle', label: 'Check Circle', icon: CheckCircle },
  { value: 'x-circle', label: 'X Circle', icon: XCircle },
  { value: 'alert-circle', label: 'Alert Circle', icon: AlertCircle },
  { value: 'circle-dot', label: 'Circle Dot', icon: CircleDot },
  { value: 'rotate-ccw', label: 'Rotate', icon: RotateCcw }
];

const STATUS_COLORS = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' }
];

const defaultStatuses: WorkOrderStatus[] = [
  {
    id: 'pending',
    name: 'pending',
    label: 'Pending',
    color: 'gray',
    icon: 'clock',
    order: 1,
    is_active: true,
    is_default: true,
    is_closed: false,
    is_billable: false,
    requires_approval: false,
    auto_assign: false,
    send_notifications: true,
    description: 'Work order has been created and is waiting to be assigned'
  },
  {
    id: 'in_progress',
    name: 'in_progress',
    label: 'In Progress',
    color: 'blue',
    icon: 'play',
    order: 2,
    is_active: true,
    is_default: false,
    is_closed: false,
    is_billable: false,
    requires_approval: false,
    auto_assign: false,
    send_notifications: true,
    description: 'Work is currently being performed'
  },
  {
    id: 'completed',
    name: 'completed',
    label: 'Completed',
    color: 'green',
    icon: 'check-circle',
    order: 3,
    is_active: true,
    is_default: false,
    is_closed: true,
    is_billable: true,
    requires_approval: false,
    auto_assign: false,
    send_notifications: true,
    description: 'Work has been completed successfully'
  }
];

export function WorkOrderStatusTab() {
  const [statuses, setStatuses] = useState<WorkOrderStatus[]>(defaultStatuses);
  const [editingStatus, setEditingStatus] = useState<WorkOrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();
  const { shopId, loading: shopLoading } = useShopId();

  useEffect(() => {
    if (shopId) {
      loadStatuses();
    }
  }, [shopId]);

  const loadStatuses = async () => {
    if (!shopId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('settings_value')
        .eq('shop_id', shopId)
        .eq('settings_key', 'work_order_statuses')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.settings_value) {
        const statusesData = data.settings_value as unknown;
        if (Array.isArray(statusesData)) {
          setStatuses(statusesData as WorkOrderStatus[]);
        }
      }
    } catch (error) {
      console.error('Error loading statuses:', error);
      toast({
        title: "Error",
        description: "Failed to load work order statuses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveStatuses = async () => {
    if (!shopId) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          shop_id: shopId,
          settings_key: 'work_order_statuses',
          settings_value: statuses as any,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Work order statuses saved successfully",
      });
    } catch (error) {
      console.error('Error saving statuses:', error);
      toast({
        title: "Error",
        description: "Failed to save work order statuses",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const createNewStatus = () => {
    const newStatus: WorkOrderStatus = {
      id: crypto.randomUUID(),
      name: '',
      label: '',
      color: 'blue',
      icon: 'circle-dot',
      order: statuses.length + 1,
      is_active: true,
      is_default: false,
      is_closed: false,
      is_billable: false,
      requires_approval: false,
      auto_assign: false,
      send_notifications: true
    };
    setEditingStatus(newStatus);
    setShowEditor(true);
  };

  const editStatus = (status: WorkOrderStatus) => {
    setEditingStatus({ ...status });
    setShowEditor(true);
  };

  const deleteStatus = (statusId: string) => {
    const status = statuses.find(s => s.id === statusId);
    if (status?.is_default) {
      toast({
        title: "Error",
        description: "Cannot delete default status",
        variant: "destructive",
      });
      return;
    }
    setStatuses(prev => prev.filter(s => s.id !== statusId));
  };

  const saveStatus = () => {
    if (!editingStatus || !editingStatus.name || !editingStatus.label) {
      toast({
        title: "Error",
        description: "Status name and label are required",
        variant: "destructive",
      });
      return;
    }

    const existingIndex = statuses.findIndex(s => s.id === editingStatus.id);
    
    if (existingIndex >= 0) {
      setStatuses(prev => prev.map((s, i) => i === existingIndex ? editingStatus : s));
    } else {
      setStatuses(prev => [...prev, editingStatus]);
    }

    setEditingStatus(null);
    setShowEditor(false);
  };

  const moveStatus = (statusId: string, direction: 'up' | 'down') => {
    const index = statuses.findIndex(s => s.id === statusId);
    if (index === -1) return;

    const newStatuses = [...statuses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newStatuses.length) return;

    // Swap positions
    [newStatuses[index], newStatuses[targetIndex]] = [newStatuses[targetIndex], newStatuses[index]];
    
    // Update order numbers
    newStatuses.forEach((status, i) => {
      status.order = i + 1;
    });

    setStatuses(newStatuses);
  };

  const getIconComponent = (iconName: string) => {
    const iconData = STATUS_ICONS.find(icon => icon.value === iconName);
    return iconData?.icon || CircleDot;
  };

  const getColorClass = (colorName: string) => {
    const colorData = STATUS_COLORS.find(color => color.value === colorName);
    return colorData?.class || 'bg-gray-500';
  };

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CircleDot className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Work Order Status Management</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={createNewStatus}>
            <Plus className="h-4 w-4 mr-1" />
            Add Status
          </Button>
          <Button onClick={saveStatuses} disabled={saving} variant="outline">
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {!showEditor ? (
        <div className="space-y-4">
          {statuses
            .sort((a, b) => a.order - b.order)
            .map((status, index) => {
              const IconComponent = getIconComponent(status.icon);
              return (
                <Card key={status.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveStatus(status.id, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveStatus(status.id, 'down')}
                            disabled={index === statuses.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${getColorClass(status.color)} flex items-center justify-center text-white`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{status.label}</h3>
                              <div className="flex gap-1">
                                {status.is_default && <Badge variant="outline">Default</Badge>}
                                {status.is_closed && <Badge variant="secondary">Closed</Badge>}
                                {status.is_billable && <Badge variant="default">Billable</Badge>}
                                {!status.is_active && <Badge variant="destructive">Inactive</Badge>}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {status.description || `Status: ${status.name}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Switch checked={status.requires_approval} disabled />
                            <span>Approval</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch checked={status.auto_assign} disabled />
                            <span>Auto-assign</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch checked={status.send_notifications} disabled />
                            <span>Notify</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch checked={status.is_active} disabled />
                            <span>Active</span>
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editStatus(status)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          {!status.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteStatus(status.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingStatus?.name ? `Edit Status: ${editingStatus.label}` : 'New Status'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status_name">Status Name (Internal) *</Label>
                <Input
                  id="status_name"
                  value={editingStatus?.name || ''}
                  onChange={(e) => setEditingStatus(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="e.g., awaiting_parts"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status_label">Display Label *</Label>
                <Input
                  id="status_label"
                  value={editingStatus?.label || ''}
                  onChange={(e) => setEditingStatus(prev => prev ? { ...prev, label: e.target.value } : null)}
                  placeholder="e.g., Awaiting Parts"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status_color">Color</Label>
                <Select 
                  value={editingStatus?.color} 
                  onValueChange={(value) => setEditingStatus(prev => prev ? { ...prev, color: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status_icon">Icon</Label>
                <Select 
                  value={editingStatus?.icon} 
                  onValueChange={(value) => setEditingStatus(prev => prev ? { ...prev, icon: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ICONS.map(icon => {
                      const IconComponent = icon.icon;
                      return (
                        <SelectItem key={icon.value} value={icon.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4" />
                            {icon.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_description">Description</Label>
              <Input
                id="status_description"
                value={editingStatus?.description || ''}
                onChange={(e) => setEditingStatus(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Describe when this status should be used"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingStatus?.is_active !== false}
                  onCheckedChange={(checked) => setEditingStatus(prev => prev ? { ...prev, is_active: checked } : null)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={editingStatus?.is_default || false}
                  onCheckedChange={(checked) => setEditingStatus(prev => prev ? { ...prev, is_default: checked } : null)}
                />
                <Label htmlFor="is_default">Default</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_closed"
                  checked={editingStatus?.is_closed || false}
                  onCheckedChange={(checked) => setEditingStatus(prev => prev ? { ...prev, is_closed: checked } : null)}
                />
                <Label htmlFor="is_closed">Closed Status</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_billable"
                  checked={editingStatus?.is_billable || false}
                  onCheckedChange={(checked) => setEditingStatus(prev => prev ? { ...prev, is_billable: checked } : null)}
                />
                <Label htmlFor="is_billable">Billable</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_approval"
                  checked={editingStatus?.requires_approval || false}
                  onCheckedChange={(checked) => setEditingStatus(prev => prev ? { ...prev, requires_approval: checked } : null)}
                />
                <Label htmlFor="requires_approval">Requires Approval</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_assign"
                  checked={editingStatus?.auto_assign || false}
                  onCheckedChange={(checked) => setEditingStatus(prev => prev ? { ...prev, auto_assign: checked } : null)}
                />
                <Label htmlFor="auto_assign">Auto-assign</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="send_notifications"
                  checked={editingStatus?.send_notifications !== false}
                  onCheckedChange={(checked) => setEditingStatus(prev => prev ? { ...prev, send_notifications: checked } : null)}
                />
                <Label htmlFor="send_notifications">Send Notifications</Label>
              </div>
            </div>

            {editingStatus && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium mb-2 block">Preview</Label>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${getColorClass(editingStatus.color)} flex items-center justify-center text-white`}>
                    {React.createElement(getIconComponent(editingStatus.icon), { className: "h-4 w-4" })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{editingStatus.label || 'Status Label'}</span>
                      <div className="flex gap-1">
                        {editingStatus.is_default && <Badge variant="outline">Default</Badge>}
                        {editingStatus.is_closed && <Badge variant="secondary">Closed</Badge>}
                        {editingStatus.is_billable && <Badge variant="default">Billable</Badge>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {editingStatus.description || 'No description provided'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={saveStatus}>
                <Save className="h-4 w-4 mr-1" />
                Save Status
              </Button>
              <Button variant="outline" onClick={() => setShowEditor(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}