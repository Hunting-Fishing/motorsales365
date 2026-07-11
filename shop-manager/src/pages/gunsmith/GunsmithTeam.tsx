import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useGunsmithTeam, 
  useAddGunsmithTeamMember, 
  useUpdateGunsmithTeamMember, 
  useRemoveGunsmithTeamMember, 
  useUpdateGunsmithTeamMemberProfile,
  useUpdateGunsmithTeamMemberRoles,
  GunsmithTeamMember 
} from '@/hooks/gunsmith/useGunsmithTeam';
import { useGunsmithRoles } from '@/hooks/gunsmith/useGunsmithRoles';
import { Loader2, Plus, UserPlus, MoreVertical, Edit, Trash2, Phone, Mail, Shield, User, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function GunsmithTeam() {
  const { data: team, isLoading } = useGunsmithTeam();
  const { data: roles } = useGunsmithRoles();
  const addMember = useAddGunsmithTeamMember();
  const updateMember = useUpdateGunsmithTeamMember();
  const removeMember = useRemoveGunsmithTeamMember();
  const updateProfile = useUpdateGunsmithTeamMemberProfile();
  const updateRoles = useUpdateGunsmithTeamMemberRoles();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<GunsmithTeamMember | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  
  // Edit form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editHireDate, setEditHireDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Get available profiles that aren't already team members
  const { data: profiles } = useQuery({
    queryKey: ['profiles-for-team'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
  });

  const availableProfiles = profiles?.filter(
    p => !team?.some(t => t.profile_id === p.id)
  );

  const handleAddMember = () => {
    if (!selectedProfileId || !selectedRoleId) return;
    
    addMember.mutate({
      profile_id: selectedProfileId,
      role_id: selectedRoleId,
    }, {
      onSuccess: () => {
        setAddDialogOpen(false);
        setSelectedProfileId('');
        setSelectedRoleId('');
      }
    });
  };

  const handleEditMember = (member: GunsmithTeamMember) => {
    setMemberToEdit(member);
    setEditFirstName(member.profile?.first_name || '');
    setEditLastName(member.profile?.last_name || '');
    setEditPhone(member.profile?.phone || '');
    setEditJobTitle(member.profile?.job_title || '');
    setEditIsActive(member.is_active);
    setEditHireDate(member.hire_date || '');
    setEditNotes(member.notes || '');
    // Get role IDs from the roles array or fall back to single role_id
    const currentRoleIds = member.roles?.map(r => r.role_id) || (member.role_id ? [member.role_id] : []);
    setEditSelectedRoles(currentRoleIds);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!memberToEdit) return;
    
    setIsSaving(true);
    try {
      // Update profile
      await updateProfile.mutateAsync({
        profileId: memberToEdit.profile_id,
        updates: {
          first_name: editFirstName || undefined,
          last_name: editLastName || undefined,
          phone: editPhone || undefined,
          job_title: editJobTitle || undefined,
        },
      });

      // Update team member (active status, hire date, notes)
      await updateMember.mutateAsync({
        id: memberToEdit.id,
        is_active: editIsActive,
        hire_date: editHireDate || null,
        notes: editNotes || null,
      });

      // Update roles
      await updateRoles.mutateAsync({
        teamMemberId: memberToEdit.id,
        roleIds: editSelectedRoles,
      });

      setEditDialogOpen(false);
      setMemberToEdit(null);
    } catch (error) {
      // Error is handled by individual mutation hooks
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = () => {
    if (!memberToDelete) return;
    removeMember.mutate(memberToDelete, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setMemberToDelete(null);
      }
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    updateMember.mutate({ id, is_active: !currentActive });
  };

  const toggleRole = (roleId: string) => {
    setEditSelectedRoles(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeMembers = team?.filter(m => m.is_active) || [];
  const inactiveMembers = team?.filter(m => !m.is_active) || [];

  const getMemberRoles = (member: GunsmithTeamMember) => {
    if (member.roles && member.roles.length > 0) {
      return member.roles.map(r => r.role?.name).filter(Boolean);
    }
    return member.role?.name ? [member.role.name] : [];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gunsmith Team</h1>
          <p className="text-muted-foreground">Manage your gunsmith shop team members</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/gunsmith/roles">
              <Shield className="mr-2 h-4 w-4" />
              Manage Roles
            </Link>
          </Button>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Team Member
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add an existing user to your gunsmith team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles?.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.first_name} {profile.last_name} ({profile.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign Role</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={addMember.isPending}>
                {addMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle>Active Team Members ({activeMembers.length})</CardTitle>
          <CardDescription>Current active staff in your gunsmith shop</CardDescription>
        </CardHeader>
        <CardContent>
          {activeMembers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active team members. Add your first team member above.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeMembers.map(member => {
                const memberRoles = getMemberRoles(member);
                return (
                  <Card key={member.id} className="relative">
                    <CardContent className="pt-6">
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditMember(member)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(member.id, true)}>
                              Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setMemberToDelete(member.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {member.profile?.first_name?.[0]}{member.profile?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {member.profile?.first_name} {member.profile?.last_name}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {memberRoles.length > 0 ? (
                              memberRoles.map((roleName, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {roleName}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs">No Role</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        {member.profile?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{member.profile.email}</span>
                          </div>
                        )}
                        {member.profile?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{member.profile.phone}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Members */}
      {inactiveMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Members ({inactiveMembers.length})</CardTitle>
            <CardDescription>Previously active team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inactiveMembers.map(member => {
                const memberRoles = getMemberRoles(member);
                return (
                  <Card key={member.id} className="relative opacity-60">
                    <CardContent className="pt-6">
                      <div className="absolute top-2 right-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleActive(member.id, false)}
                        >
                          Reactivate
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>
                            {member.profile?.first_name?.[0]}{member.profile?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.profile?.first_name} {member.profile?.last_name}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {memberRoles.length > 0 ? (
                              memberRoles.map((roleName, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {roleName}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs">No Role</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update {memberToEdit?.profile?.first_name} {memberToEdit?.profile?.last_name}'s information
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="status" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Status
              </TabsTrigger>
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={memberToEdit?.profile?.email || ''}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email can only be changed from account settings
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  placeholder="e.g. Master Gunsmith, Apprentice"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="status" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="isActive" className="text-base font-medium">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {editIsActive ? 'This team member is currently active' : 'This team member is inactive'}
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input 
                  id="hireDate"
                  type="date" 
                  value={editHireDate} 
                  onChange={(e) => setEditHireDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes"
                  placeholder="Add notes about this team member..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="roles" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Assigned Roles</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select one or more roles for this team member
                </p>
                <div className="grid gap-3">
                  {roles?.map(role => (
                    <div
                      key={role.id}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        editSelectedRoles.includes(role.id)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleRole(role.id)}
                    >
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={editSelectedRoles.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {role.name}
                        </Label>
                        {role.description && (
                          <p className="text-sm text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>
                      {role.role_type && (
                        <Badge variant="outline" className="text-xs">
                          {role.role_type}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                {editSelectedRoles.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    Please select at least one role
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
