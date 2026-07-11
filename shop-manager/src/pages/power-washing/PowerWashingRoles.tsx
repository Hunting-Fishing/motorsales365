import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { ArrowLeft, Plus, Shield, Edit2, Trash2, Users, Briefcase, Wrench, Droplets, MapPin, Receipt, Settings, Lock } from 'lucide-react';
import { usePowerWashingRoles, PowerWashingRole } from '@/hooks/power-washing/usePowerWashingRoles';
import { useShopId } from '@/hooks/useShopId';
import { Skeleton } from '@/components/ui/skeleton';

const PERMISSION_CATEGORIES = [
  { key: 'jobs', label: 'Jobs', icon: Briefcase, actions: ['view', 'create', 'edit', 'delete', 'assign'] },
  { key: 'customers', label: 'Customers', icon: Users, actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'equipment', label: 'Equipment', icon: Wrench, actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'chemicals', label: 'Chemicals', icon: Droplets, actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'routes', label: 'Routes', icon: MapPin, actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'invoices', label: 'Invoices', icon: Receipt, actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'settings', label: 'Settings', icon: Settings, actions: ['view', 'edit'] },
  { key: 'team', label: 'Team', icon: Users, actions: ['view', 'manage'] },
];

export default function PowerWashingRoles() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const { roles, isLoading, createRole, updateRole, deleteRole, seedDefaultRoles, isCreating, isUpdating } = usePowerWashingRoles(shopId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<PowerWashingRole | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, string[]>,
  });

  useEffect(() => {
    if (selectedRole) {
      setFormData({
        name: selectedRole.name,
        description: selectedRole.description || '',
        permissions: selectedRole.permissions || {},
      });
    } else {
      setFormData({ name: '', description: '', permissions: {} });
    }
  }, [selectedRole]);

  // Seed default roles if none exist
  useEffect(() => {
    if (!isLoading && roles.length === 0 && shopId) {
      seedDefaultRoles();
    }
  }, [isLoading, roles.length, shopId]);

  const handleOpenCreate = () => {
    setSelectedRole(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (role: PowerWashingRole) => {
    setSelectedRole(role);
    setDialogOpen(true);
  };

  const handleOpenDelete = (role: PowerWashingRole) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  const handleTogglePermission = (category: string, action: string) => {
    setFormData((prev) => {
      const currentActions = prev.permissions[category] || [];
      const hasAction = currentActions.includes(action);
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [category]: hasAction
            ? currentActions.filter((a) => a !== action)
            : [...currentActions, action],
        },
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      if (selectedRole) {
        await updateRole({
          id: selectedRole.id,
          name: formData.name,
          description: formData.description || undefined,
          permissions: formData.permissions,
        });
      } else {
        await createRole({
          name: formData.name,
          description: formData.description || undefined,
          permissions: formData.permissions,
        });
      }
      setDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Failed to save role:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    try {
      await deleteRole(selectedRole.id);
      setDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  if (isLoading) {
    return (
      <MobilePageContainer>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </MobilePageContainer>
    );
  }

  return (
    <MobilePageContainer>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/power-washing/team')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Manage Roles</h1>
            <p className="text-sm text-muted-foreground">Configure team roles and permissions</p>
          </div>
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Role
          </Button>
        </div>

        {/* Roles List */}
        <div className="space-y-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {role.name}
                        {role.is_system && (
                          <Badge variant="secondary" className="text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            System
                          </Badge>
                        )}
                      </CardTitle>
                      {role.description && (
                        <CardDescription className="text-sm">{role.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(role)}
                      disabled={role.is_system}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDelete(role)}
                      disabled={role.is_system}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(role.permissions || {}).map(([category, actions]) => (
                    <Badge key={category} variant="outline" className="text-xs">
                      {category}: {(actions as string[]).join(', ')}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create/Edit Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              {selectedRole ? 'Modify role settings and permissions' : 'Create a new custom role'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Senior Technician"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this role..."
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              {PERMISSION_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const currentActions = formData.permissions[category.key] || [];

                return (
                  <div key={category.key} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{category.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {category.actions.map((action) => (
                        <label key={action} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox
                            checked={currentActions.includes(action)}
                            onCheckedChange={() => handleTogglePermission(category.key, action)}
                          />
                          <span className="capitalize">{action}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
              {selectedRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRole?.name}"? This action cannot be undone.
              Team members with this role will have their role unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageContainer>
  );
}
