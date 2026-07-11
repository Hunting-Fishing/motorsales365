import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, HardHat, Package, Users, AlertTriangle } from 'lucide-react';
import { usePPEManagement, PPEItem, PPEAssignment } from '@/hooks/usePPEManagement';
import { format } from 'date-fns';

export default function PPEManagement() {
  const { 
    inventory, 
    assignments, 
    loadingInventory, 
    loadingAssignments,
    createInventoryItem, 
    createAssignment, 
    updateAssignment 
  } = usePPEManagement();
  
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const [itemForm, setItemForm] = useState({ 
    name: '', 
    category: '', 
    description: '', 
    manufacturer: '', 
    model_number: '', 
    unit_cost: '', 
    minimum_stock_level: 5, 
    quantity_in_stock: 0, 
    storage_location: '' 
  });
  const [assignForm, setAssignForm] = useState({ 
    ppe_item_id: '', 
    employee_id: '', 
    quantity: 1,
    serial_number: '', 
    expiry_date: '' 
  });

  const isLoading = loadingInventory || loadingAssignments;

  const lowStockItems = inventory.filter(item => item.quantity_in_stock <= (item.minimum_stock_level || 5));
  const expiringAssignments = assignments.filter(a => {
    if (!a.expiry_date) return false;
    const daysUntilExpiry = Math.ceil((new Date(a.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  const handleCreateItem = () => {
    createInventoryItem.mutate({
      ...itemForm,
      unit_cost: itemForm.unit_cost ? parseFloat(itemForm.unit_cost) : undefined,
    }, {
      onSuccess: () => {
        setItemDialogOpen(false);
        setItemForm({ name: '', category: '', description: '', manufacturer: '', model_number: '', unit_cost: '', minimum_stock_level: 5, quantity_in_stock: 0, storage_location: '' });
      }
    });
  };

  const handleCreateAssignment = () => {
    createAssignment.mutate({
      ...assignForm,
      expiry_date: assignForm.expiry_date || undefined
    }, {
      onSuccess: () => {
        setAssignDialogOpen(false);
        setAssignForm({ ppe_item_id: '', employee_id: '', quantity: 1, serial_number: '', expiry_date: '' });
      }
    });
  };

  const getConditionBadge = (condition?: string) => {
    const colors: Record<string, string> = {
      new: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-orange-100 text-orange-800',
      damaged: 'bg-red-100 text-red-800'
    };
    return <Badge className={colors[condition || 'good']}>{condition || 'good'}</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      returned: 'secondary',
      expired: 'destructive',
      damaged: 'destructive',
      lost: 'destructive',
    };
    return <Badge variant={variants[status || 'active'] || 'secondary'}>{(status || 'active').replace('_', ' ')}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">PPE Management</h1>
          <p className="text-muted-foreground">Track personal protective equipment inventory and assignments</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{inventory.length}</p>
                <p className="text-sm text-muted-foreground">PPE Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{assignments.filter(a => a.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{expiringAssignments.length}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add PPE Item</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add PPE Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div><Label>Name</Label><Input value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} /></div>
                  <div><Label>Category</Label><Input value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} placeholder="e.g., Head Protection, Eye Protection" /></div>
                  <div><Label>Description</Label><Input value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Manufacturer</Label><Input value={itemForm.manufacturer} onChange={e => setItemForm({...itemForm, manufacturer: e.target.value})} /></div>
                    <div><Label>Model</Label><Input value={itemForm.model_number} onChange={e => setItemForm({...itemForm, model_number: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Unit Cost</Label><Input type="number" value={itemForm.unit_cost} onChange={e => setItemForm({...itemForm, unit_cost: e.target.value})} /></div>
                    <div><Label>Stock</Label><Input type="number" value={itemForm.quantity_in_stock} onChange={e => setItemForm({...itemForm, quantity_in_stock: parseInt(e.target.value) || 0})} /></div>
                    <div><Label>Min Stock</Label><Input type="number" value={itemForm.minimum_stock_level} onChange={e => setItemForm({...itemForm, minimum_stock_level: parseInt(e.target.value) || 5})} /></div>
                  </div>
                  <div><Label>Storage Location</Label><Input value={itemForm.storage_location} onChange={e => setItemForm({...itemForm, storage_location: e.target.value})} /></div>
                  <Button onClick={handleCreateItem} disabled={createInventoryItem.isPending}>Add Item</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inventory.map(item => (
              <Card key={item.id} className={item.quantity_in_stock <= (item.minimum_stock_level || 5) ? 'border-yellow-500' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <HardHat className="h-5 w-5" />
                      {item.name}
                    </CardTitle>
                    {item.quantity_in_stock <= (item.minimum_stock_level || 5) && <Badge variant="destructive">Low Stock</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.category && <Badge variant="outline">{item.category}</Badge>}
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  <div className="flex justify-between text-sm">
                    <span>Stock: <strong>{item.quantity_in_stock}</strong></span>
                    <span>Min: {item.minimum_stock_level || 5}</span>
                  </div>
                  {item.manufacturer && <p className="text-sm">{item.manufacturer} {item.model_number}</p>}
                  {item.storage_location && <p className="text-sm">📍 {item.storage_location}</p>}
                  {item.unit_cost && <p className="text-sm font-medium">${item.unit_cost}</p>}
                </CardContent>
              </Card>
            ))}
            {inventory.length === 0 && !isLoading && (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No PPE items found</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Assign PPE</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign PPE to Employee</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>PPE Item</Label>
                    <select className="w-full border rounded p-2" value={assignForm.ppe_item_id} onChange={e => setAssignForm({...assignForm, ppe_item_id: e.target.value})}>
                      <option value="">Select item</option>
                      {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div><Label>Employee ID</Label><Input value={assignForm.employee_id} onChange={e => setAssignForm({...assignForm, employee_id: e.target.value})} placeholder="Employee UUID" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Quantity</Label><Input type="number" value={assignForm.quantity} onChange={e => setAssignForm({...assignForm, quantity: parseInt(e.target.value) || 1})} /></div>
                    <div><Label>Serial Number</Label><Input value={assignForm.serial_number} onChange={e => setAssignForm({...assignForm, serial_number: e.target.value})} /></div>
                  </div>
                  <div><Label>Expiry Date</Label><Input type="date" value={assignForm.expiry_date} onChange={e => setAssignForm({...assignForm, expiry_date: e.target.value})} /></div>
                  <Button onClick={handleCreateAssignment} disabled={createAssignment.isPending}>Assign</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map(assignment => {
              const item = assignment.ppe_inventory || inventory.find(i => i.id === assignment.ppe_item_id);
              return (
                <Card key={assignment.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{item?.name || 'Unknown Item'}</CardTitle>
                      {getStatusBadge(assignment.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Condition:</span>
                      {getConditionBadge(assignment.condition)}
                    </div>
                    <p className="text-sm">Qty: {assignment.quantity}</p>
                    {assignment.serial_number && <p className="text-sm">S/N: {assignment.serial_number}</p>}
                    <p className="text-xs text-muted-foreground">Assigned: {format(new Date(assignment.assigned_date), 'PP')}</p>
                    {assignment.expiry_date && (
                      <p className="text-xs text-muted-foreground">Expires: {format(new Date(assignment.expiry_date), 'PP')}</p>
                    )}
                    {assignment.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => updateAssignment.mutate({ id: assignment.id, status: 'returned', returned_date: new Date().toISOString() })}>
                        Mark Returned
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {assignments.length === 0 && !isLoading && (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No PPE assignments found</CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
