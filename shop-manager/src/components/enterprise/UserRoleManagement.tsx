
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_custom: boolean | null;
  is_default: boolean | null;
  user_count?: number;
  permission_count?: number;
}

export const UserRoleManagement = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      // Fetch roles
      const { data: rolesData, error } = await supabase
        .from('roles')
        .select('id, name, description, is_custom, is_default')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Get user counts per role
      const { data: userCounts } = await supabase
        .from('user_roles')
        .select('role_id');

      const countMap = (userCounts || []).reduce((acc: Record<string, number>, item) => {
        acc[item.role_id] = (acc[item.role_id] || 0) + 1;
        return acc;
      }, {});

      // Get permission counts per role
      const { data: permCounts } = await supabase
        .from('role_permissions')
        .select('role_id');

      const permMap = (permCounts || []).reduce((acc: Record<string, number>, item) => {
        acc[item.role_id] = (acc[item.role_id] || 0) + 1;
        return acc;
      }, {});

      setRoles((rolesData || []).map(role => ({
        ...role,
        user_count: countMap[role.id] || 0,
        permission_count: permMap[role.id] || 0
      })));
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load roles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setDialogOpen(true);
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_default) {
      toast({
        title: 'Cannot delete',
        description: 'Default roles cannot be deleted',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', role.id);

      if (error) throw error;

      toast({ title: 'Role deleted' });
      loadRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation error',
        description: 'Role name is required',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        // Update existing role - only update description for safety
        const { error } = await supabase
          .from('roles')
          .update({
            description: formData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRole.id);

        if (error) throw error;
        toast({ title: 'Role updated' });
      } else {
        // For new roles, we can't add arbitrary names due to enum constraint
        // Show a message about this limitation
        toast({ 
          title: 'Note',
          description: 'Custom role creation requires database schema update. Contact administrator.',
        });
      }

      setDialogOpen(false);
      loadRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: 'Error',
        description: 'Failed to save role',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User & Role Management</h2>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Button onClick={handleAddRole}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {role.name}
                {role.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditRole(role)}>
                  <Edit className="h-3 w-3" />
                </Button>
                {!role.is_default && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteRole(role)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{role.user_count}</div>
              <p className="text-xs text-muted-foreground">
                {role.permission_count} permissions
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Add Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter role name"
                disabled={!!editingRole} // Can't change name of existing role due to enum
              />
              {editingRole && (
                <p className="text-xs text-muted-foreground">Role names cannot be changed after creation</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter role description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRole ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
