import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Gauge, 
  Edit, 
  Save, 
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { usePowerWashingEquipment, PowerWashingEquipment } from '@/hooks/usePowerWashing';
import { EquipmentMaintenanceLog } from '@/components/power-washing/EquipmentMaintenanceLog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const conditionColors: Record<string, string> = {
  excellent: 'bg-green-500/10 text-green-500 border-green-500/20',
  good: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  fair: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  poor: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

export default function PowerWashingEquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: equipment, isLoading } = usePowerWashingEquipment();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<PowerWashingEquipment>>({});

  const item = equipment?.find(e => e.id === id);
  const shopId = item?.shop_id;

  const today = new Date().toISOString().split('T')[0];
  const needsMaintenance = item?.next_maintenance_date && item.next_maintenance_date <= today;

  const startEditing = () => {
    if (item) {
      setEditData({
        name: item.name,
        brand: item.brand,
        model: item.model,
        serial_number: item.serial_number,
        psi_rating: item.psi_rating,
        gpm_rating: item.gpm_rating,
        condition: item.condition,
        next_maintenance_date: item.next_maintenance_date,
        notes: item.notes,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('power_washing_equipment')
        .update(editData)
        .eq('id', id);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['power-washing-equipment'] });
      toast.success('Equipment updated');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update:', error);
      toast.error('Failed to update equipment');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Equipment Not Found</h2>
            <Button onClick={() => navigate('/power-washing/equipment')}>
              Back to Equipment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing/equipment')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Equipment
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Gauge className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
                <Badge className={conditionColors[item.condition]}>{item.condition}</Badge>
                {needsMaintenance && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Maintenance Due
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground capitalize">
                {item.equipment_type.replace('_', ' ')}
                {item.brand && ` • ${item.brand}`}
                {item.model && ` ${item.model}`}
              </p>
            </div>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={startEditing}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={editData.name || ''}
                            onChange={(e) => setEditData(p => ({ ...p, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Condition</Label>
                          <Select 
                            value={editData.condition} 
                            onValueChange={(v) => setEditData(p => ({ ...p, condition: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CONDITIONS.map(c => (
                                <SelectItem key={c} value={c}>
                                  {c.charAt(0).toUpperCase() + c.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Brand</Label>
                          <Input
                            value={editData.brand || ''}
                            onChange={(e) => setEditData(p => ({ ...p, brand: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Model</Label>
                          <Input
                            value={editData.model || ''}
                            onChange={(e) => setEditData(p => ({ ...p, model: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Serial Number</Label>
                          <Input
                            value={editData.serial_number || ''}
                            onChange={(e) => setEditData(p => ({ ...p, serial_number: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Next Maintenance</Label>
                          <Input
                            type="date"
                            value={editData.next_maintenance_date || ''}
                            onChange={(e) => setEditData(p => ({ ...p, next_maintenance_date: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>PSI Rating</Label>
                          <Input
                            type="number"
                            value={editData.psi_rating || ''}
                            onChange={(e) => setEditData(p => ({ ...p, psi_rating: parseInt(e.target.value) || null }))}
                          />
                        </div>
                        <div>
                          <Label>GPM Rating</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editData.gpm_rating || ''}
                            onChange={(e) => setEditData(p => ({ ...p, gpm_rating: parseFloat(e.target.value) || null }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={editData.notes || ''}
                          onChange={(e) => setEditData(p => ({ ...p, notes: e.target.value }))}
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Brand</p>
                        <p className="font-medium">{item.brand || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Model</p>
                        <p className="font-medium">{item.model || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Serial Number</p>
                        <p className="font-medium">{item.serial_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">PSI Rating</p>
                        <p className="font-medium">{item.psi_rating?.toLocaleString() || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">GPM Rating</p>
                        <p className="font-medium">{item.gpm_rating || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Purchase Date</p>
                        <p className="font-medium">
                          {item.purchase_date ? format(new Date(item.purchase_date), 'MMM d, yyyy') : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Purchase Price</p>
                        <p className="font-medium">
                          {item.purchase_price ? `$${item.purchase_price.toLocaleString()}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Maintenance</p>
                        <p className="font-medium">
                          {item.last_maintenance_date ? format(new Date(item.last_maintenance_date), 'MMM d, yyyy') : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Next Maintenance</p>
                        <p className={`font-medium ${needsMaintenance ? 'text-destructive' : ''}`}>
                          {item.next_maintenance_date ? format(new Date(item.next_maintenance_date), 'MMM d, yyyy') : '—'}
                        </p>
                      </div>
                      {item.notes && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="font-medium whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-4">
              {shopId && (
                <EquipmentMaintenanceLog
                  equipmentId={id!}
                  shopId={shopId}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['power-washing-equipment'] })}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={item.is_active ? 'default' : 'secondary'}>
                  {item.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {item.psi_rating && item.gpm_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Cleaning Units</span>
                  <span className="font-medium">{(item.psi_rating * item.gpm_rating).toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
