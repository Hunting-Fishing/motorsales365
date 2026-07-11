import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useGunsmithRoles, useCreateGunsmithRole, useUpdateGunsmithRole, useDeleteGunsmithRole, GunsmithRole } from '@/hooks/gunsmith/useGunsmithRoles';
import { Loader2, Plus, Shield, Edit, Trash2, Lock, Users, Briefcase, Package, Receipt, FileCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const PERMISSION_CATEGORIES = [
  { key: 'jobs', label: 'Jobs', icon: Briefcase, actions: ['view', 'create', 'edit', 'delete', 'assign'] },
  { key: 'customers', label: 'Customers', icon: Users, actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'parts', label: 'Parts & Inventory', icon: Package, actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'invoices', label: 'Invoices', icon: Receipt, actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'compliance', label: 'Compliance', icon: FileCheck, actions: ['view', 'create', 'edit'] },
  { key: 'settings', label: 'Settings', icon: Shield, actions: ['view', 'edit'] },
  { key: 'team', label: 'Team', icon: Users, actions: ['view', 'manage'] },
];

export default function GunsmithRoles() {
  const { data: roles, isLoading } = useGunsmithRoles();
  const createRole = useCreateGunsmithRole();
  const updateRole = useUpdateGunsmithRole();
  const deleteRole = useDeleteGunsmithRole();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<GunsmithRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<GunsmithRole | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, string[]>,
  });

  const handlePermissionChange = (category: string, action: string, checked: boolean) => {
    setFormData(prev => {
      const currentActions = prev.permissions[category] || [];
      const newActions = checked
        ? [...currentActions, action]
        : currentActions.filter(a => a !== action);
      
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [category]: newActions,
        },
      };
    });
  };

  const handleCreateRole = () => {
    createRole.mutate(formData, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setFormData({ name: '', description: '', permissions: {} });
      },
    });
  };

  const handleUpdateRole = () => {
    if (!roleToEdit) return;
    updateRole.mutate({ id: roleToEdit.id, ...formData }, {
      onSuccess: () => {
        setEditDialogOpen(false);
        setRoleToEdit(null);
        setFormData({ name: '', description: '', permissions: {} });
      },
    });
  };

  const handleDeleteRole = () => {
    if (!roleToDelete) return;
    deleteRole.mutate(roleToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setRoleToDelete(null);
      },
    });
  };

  const openEditDialog = (role: GunsmithRole) => {
    setRoleToEdit(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || {},
    });
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const systemRoles = roles?.filter(r => r.is_system) || [];
  const customRoles = roles?.filter(r => !r.is_system) || [];

  const PermissionsForm = () => (
    <Accordion type="multiple" className="w-full">
      {PERMISSION_CATEGORIES.map(category => {
        const Icon = category.icon;
        return (
          <AccordionItem key={category.key} value={category.key}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {category.label}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2 pl-6">
                {category.actions.map(action => (
                  <div key={action} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${category.key}-${action}`}
                      checked={(formData.permissions[category.key] || []).includes(action)}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(category.key, action, checked as boolean)
                      }
                    />
                    <Label htmlFor={`${category.key}-${action}`} className="capitalize">
                      {action}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/gunsmith/team">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Team
          </Link>
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gunsmith Roles</h1>
          <p className="text-muted-foreground">Manage roles and permissions for your gunsmith team</p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Create a custom role with specific permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Senior Technician"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this role can do..."
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <PermissionsForm />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={createRole.isPending || !formData.name}>
                {createRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* System Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            System Roles
          </CardTitle>
          <CardDescription>
            Default roles that come pre-configured. These cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemRoles.map(role => (
              <Card key={role.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{role.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {role.description}
                      </p>
                    </div>
                    <Badge variant="secondary">System</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {Object.entries(role.permissions || {}).map(([key, actions]) => (
                      actions.length > 0 && (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {(actions as string[]).join(', ')}
                        </Badge>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Roles</CardTitle>
          <CardDescription>
            Roles you've created for your shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No custom roles yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customRoles.map(role => (
                <Card key={role.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{role.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {role.description}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRoleToDelete(role);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {Object.entries(role.permissions || {}).map(([key, actions]) => (
                        actions.length > 0 && (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {(actions as string[]).join(', ')}
                          </Badge>
                        )
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update the role name, description, and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionsForm />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={updateRole.isPending}>
              {updateRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{roleToDelete?.name}"? Team members with this role
              will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
