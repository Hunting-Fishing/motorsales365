import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useInspectionConcernRoles } from '@/hooks/useForkliftInspections';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, Users, AlertTriangle, Edit } from 'lucide-react';

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
}

const DEFAULT_ROLES = [
  { name: 'Yard Manager', description: 'Handles outdoor equipment concerns' },
  { name: 'Boat Manager', description: 'Handles marine equipment concerns' },
  { name: 'Lead Mechanic', description: 'Handles mechanical issues and repairs' },
  { name: 'Safety Manager', description: 'Handles safety-related concerns' },
  { name: 'Fleet Manager', description: 'Handles vehicle and fleet concerns' },
];

const EQUIPMENT_TYPE_OPTIONS = [
  'forklift',
  'telehandler',
  'boat',
  'vehicle',
  'trailer',
  'generator',
  'compressor',
  'other',
];

export function InspectionConcernRolesSettings() {
  const { roles, loading, createRole, updateRole, deleteRole } = useInspectionConcernRoles();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    role_name: '',
    role_description: '',
    assigned_user_id: '',
    equipment_types: [] as string[],
    priority_level: 1,
  });

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();

        if (!profile?.shop_id) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('shop_id', profile.shop_id);

        if (error) throw error;
        setUsers((data || []) as Profile[]);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleQuickAdd = async (roleName: string, description: string) => {
    await createRole({
      role_name: roleName,
      role_description: description,
    });
  };

  const handleSubmit = async () => {
    if (!formData.role_name) return;

    if (editingRole) {
      await updateRole(editingRole, formData);
    } else {
      await createRole(formData);
    }

    setDialogOpen(false);
    setEditingRole(null);
    setFormData({
      role_name: '',
      role_description: '',
      assigned_user_id: '',
      equipment_types: [],
      priority_level: 1,
    });
  };

  const handleEdit = (role: any) => {
    setEditingRole(role.id);
    setFormData({
      role_name: role.role_name,
      role_description: role.role_description || '',
      assigned_user_id: role.assigned_user_id || '',
      equipment_types: role.equipment_types || [],
      priority_level: role.priority_level || 1,
    });
    setDialogOpen(true);
  };

  const toggleEquipmentType = (type: string) => {
    setFormData(prev => ({
      ...prev,
      equipment_types: prev.equipment_types.includes(type)
        ? prev.equipment_types.filter(t => t !== type)
        : [...prev.equipment_types, type],
    }));
  };

  const existingRoleNames = roles.map(r => r.role_name.toLowerCase());
  const availableQuickRoles = DEFAULT_ROLES.filter(
    r => !existingRoleNames.includes(r.name.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Inspection Concern Roles
          </CardTitle>
          <CardDescription>
            Configure roles that receive notifications when inspections have concerns. 
            When an inspection item is marked yellow or red, it will be routed to the appropriate manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Add Roles */}
          {availableQuickRoles.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">Quick Add Common Roles</Label>
              <div className="flex flex-wrap gap-2">
                {availableQuickRoles.map((role) => (
                  <Button
                    key={role.name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdd(role.name, role.description)}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {role.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Existing Roles */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : roles.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-sm text-muted-foreground">Configured Roles</Label>
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.role_name}</span>
                      <Badge variant={role.is_active ? 'default' : 'secondary'}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Priority: {role.priority_level}
                      </Badge>
                    </div>
                    {role.role_description && (
                      <p className="text-sm text-muted-foreground">{role.role_description}</p>
                    )}
                    {role.assigned_user && (
                      <p className="text-sm">
                        Assigned to: <span className="font-medium">
                          {role.assigned_user.first_name} {role.assigned_user.last_name}
                        </span>
                      </p>
                    )}
                    {role.equipment_types && role.equipment_types.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {role.equipment_types.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={role.is_active}
                      onCheckedChange={(checked) => updateRole(role.id, { is_active: checked })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive"
                      onClick={() => deleteRole(role.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No concern roles configured</p>
              <p className="text-sm">Add roles to route inspection concerns to the right people</p>
            </div>
          )}

          {/* Add Custom Role Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRole ? 'Edit Role' : 'Add Concern Role'}</DialogTitle>
                <DialogDescription>
                  Configure who receives notifications for inspection concerns
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Role Name *</Label>
                  <Input
                    value={formData.role_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, role_name: e.target.value }))}
                    placeholder="e.g., Fleet Supervisor"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.role_description}
                    onChange={(e) => setFormData(prev => ({ ...prev, role_description: e.target.value }))}
                    placeholder="What this role handles"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Assign User</Label>
                  {loadingUsers ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Select
                      value={formData.assigned_user_id}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, assigned_user_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Equipment Types (optional)</Label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_TYPE_OPTIONS.map((type) => (
                      <Badge
                        key={type}
                        variant={formData.equipment_types.includes(type) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleEquipmentType(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to receive all equipment concerns
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Priority Level</Label>
                  <Select
                    value={String(formData.priority_level)}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, priority_level: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Highest</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5 - Lowest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.role_name}>
                  {editingRole ? 'Update' : 'Add'} Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
