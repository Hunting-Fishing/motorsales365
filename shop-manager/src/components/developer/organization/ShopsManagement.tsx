
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, MapPin, Phone, Mail, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Shop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  onboarding_completed: boolean;
  business_type: string | null;
  organization_id: string;
}

interface ShopFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  business_type: string;
}

const ShopsManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShopFormData>({
    name: '',
    address: '',
    phone: '',
    email: '',
    business_type: ''
  });

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, address, phone, email, is_active, onboarding_completed, business_type, organization_id')
        .order('name');
      
      if (error) throw error;
      return data as Shop[];
    }
  });

  // Get the organization_id from the first shop (for multi-shop orgs)
  const organizationId = shops.length > 0 ? shops[0].organization_id : null;

  const addShopMutation = useMutation({
    mutationFn: async (formValues: ShopFormData) => {
      if (!organizationId) {
        throw new Error('No organization found. Please create a shop through onboarding first.');
      }
      
      const { data: result, error } = await supabase
        .from('shops')
        .insert([{
          name: formValues.name,
          address: formValues.address || null,
          phone: formValues.phone || null,
          email: formValues.email || null,
          business_type: formValues.business_type || null,
          is_active: true,
          onboarding_completed: false,
          organization_id: organizationId
        }])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops-management'] });
      toast.success('Shop added successfully');
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to add shop');
      console.error(error);
    }
  });

  const updateShopMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ShopFormData }) => {
      const { error } = await supabase
        .from('shops')
        .update({
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          email: data.email || null,
          business_type: data.business_type || null
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops-management'] });
      toast.success('Shop updated successfully');
      setEditingShop(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update shop');
      console.error(error);
    }
  });

  const deleteShopMutation = useMutation({
    mutationFn: async (shopId: string) => {
      const { error } = await supabase
        .from('shops')
        .update({ is_active: false })
        .eq('id', shopId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops-management'] });
      toast.success('Shop deactivated successfully');
      setDeletingShopId(null);
    },
    onError: (error) => {
      toast.error('Failed to deactivate shop');
      console.error(error);
    }
  });

  const resetForm = () => {
    setFormData({ name: '', address: '', phone: '', email: '', business_type: '' });
  };

  const handleAddShop = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditShop = (shop: Shop) => {
    setFormData({
      name: shop.name,
      address: shop.address || '',
      phone: shop.phone || '',
      email: shop.email || '',
      business_type: shop.business_type || ''
    });
    setEditingShop(shop);
  };

  const handleDeleteShop = (shopId: string) => {
    setDeletingShopId(shopId);
  };

  const handleSubmitAdd = () => {
    if (!formData.name.trim()) {
      toast.error('Shop name is required');
      return;
    }
    addShopMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    if (!editingShop || !formData.name.trim()) {
      toast.error('Shop name is required');
      return;
    }
    updateShopMutation.mutate({ id: editingShop.id, data: formData });
  };

  const handleConfirmDelete = () => {
    if (deletingShopId) {
      deleteShopMutation.mutate(deletingShopId);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Shops Management
              <Badge variant="outline" className="ml-2">
                {shops.length} shops
              </Badge>
            </CardTitle>
            <Button onClick={handleAddShop}>
              <Plus className="h-4 w-4 mr-2" />
              Add Shop
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {shops.map((shop) => (
              <div key={shop.id} className="border border-border rounded-xl p-4 bg-card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-foreground">{shop.name}</h3>
                      <Badge variant={shop.is_active ? "default" : "secondary"}>
                        {shop.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {!shop.onboarding_completed && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          Setup Incomplete
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      {shop.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {shop.address}
                        </div>
                      )}
                      {shop.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {shop.phone}
                        </div>
                      )}
                      {shop.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {shop.email}
                        </div>
                      )}
                      {shop.business_type && (
                        <div className="text-muted-foreground">
                          <span className="font-medium">Type:</span> {shop.business_type}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditShop(shop)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteShop(shop.id)}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {shops.length === 0 && (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-muted rounded-full">
                  <Store className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">No shops found</p>
                  <p className="text-sm text-muted-foreground mt-1">Add your first shop to get started</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Shop Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Shop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Shop Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter shop name"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="business_type">Business Type</Label>
              <Input
                id="business_type"
                value={formData.business_type}
                onChange={(e) => setFormData(prev => ({ ...prev, business_type: e.target.value }))}
                placeholder="e.g., Full Service Auto Repair"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} disabled={addShopMutation.isPending}>
              {addShopMutation.isPending ? 'Adding...' : 'Add Shop'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Shop Dialog */}
      <Dialog open={!!editingShop} onOpenChange={(open) => !open && setEditingShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Shop Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter shop name"
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="edit-business_type">Business Type</Label>
              <Input
                id="edit-business_type"
                value={formData.business_type}
                onChange={(e) => setFormData(prev => ({ ...prev, business_type: e.target.value }))}
                placeholder="e.g., Full Service Auto Repair"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShop(null)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} disabled={updateShopMutation.isPending}>
              {updateShopMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingShopId} onOpenChange={(open) => !open && setDeletingShopId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Shop</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the shop. The shop data will be preserved but it will no longer be active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ShopsManagement;
