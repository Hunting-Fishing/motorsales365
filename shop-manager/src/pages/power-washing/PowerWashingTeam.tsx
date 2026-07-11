import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { ArrowLeft, Plus, Shield, UserPlus, Edit2, UserMinus, UserCheck, AlertTriangle, Award, Calendar } from 'lucide-react';
import { usePowerWashingTeam, PowerWashingTeamMember } from '@/hooks/power-washing/usePowerWashingTeam';
import { usePowerWashingRoles } from '@/hooks/power-washing/usePowerWashingRoles';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isBefore, addDays } from 'date-fns';

export default function PowerWashingTeam() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const { teamWithCertificates, isLoadingWithCertificates, addTeamMember, updateTeamMember, deactivateTeamMember, reactivateTeamMember, isAdding, isUpdating } = usePowerWashingTeam(shopId);
  const { roles } = usePowerWashingRoles(shopId);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PowerWashingTeamMember | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [hireDate, setHireDate] = useState('');

  // Fetch available profiles (not already team members)
  const { data: availableProfiles } = useQuery({
    queryKey: ['available-profiles-for-pw-team', shopId],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('shop_id', shopId!);

      const existingProfileIds = teamWithCertificates.map((m) => m.profile_id);
      return (profiles || []).filter((p) => !existingProfileIds.includes(p.id));
    },
    enabled: !!shopId && addDialogOpen,
  });

  const activeMembers = teamWithCertificates.filter((m) => m.is_active);
  const inactiveMembers = teamWithCertificates.filter((m) => !m.is_active);

  const getInitials = (member: PowerWashingTeamMember) => {
    const first = member.profile?.first_name?.[0] || '';
    const last = member.profile?.last_name?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const getFullName = (member: PowerWashingTeamMember) => {
    return `${member.profile?.first_name || ''} ${member.profile?.last_name || ''}`.trim() || 'Unknown';
  };

  const getCertificateStatus = (member: PowerWashingTeamMember) => {
    const certs = member.certificates || [];
    const now = new Date();
    const soonThreshold = addDays(now, 30);

    const expired = certs.filter((c) => c.expiry_date && isBefore(new Date(c.expiry_date), now));
    const expiringSoon = certs.filter(
      (c) => c.expiry_date && !isBefore(new Date(c.expiry_date), now) && isBefore(new Date(c.expiry_date), soonThreshold)
    );

    if (expired.length > 0) return { status: 'expired', count: expired.length };
    if (expiringSoon.length > 0) return { status: 'expiring', count: expiringSoon.length };
    return { status: 'valid', count: certs.length };
  };

  const handleOpenAdd = () => {
    setSelectedProfileId('');
    setSelectedRoleId('');
    setHireDate('');
    setAddDialogOpen(true);
  };

  const handleOpenEdit = (member: PowerWashingTeamMember) => {
    setSelectedMember(member);
    setSelectedRoleId(member.role_id || '');
    setHireDate(member.hire_date || '');
    setEditDialogOpen(true);
  };

  const handleOpenDeactivate = (member: PowerWashingTeamMember) => {
    setSelectedMember(member);
    setDeactivateDialogOpen(true);
  };

  const handleAddMember = async () => {
    if (!selectedProfileId) return;
    try {
      await addTeamMember({
        profile_id: selectedProfileId,
        role_id: selectedRoleId || undefined,
        hire_date: hireDate || undefined,
      });
      setAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to add team member:', error);
    }
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;
    try {
      await updateTeamMember({
        id: selectedMember.id,
        role_id: selectedRoleId || null,
        hire_date: hireDate || null,
      });
      setEditDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to update team member:', error);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedMember) return;
    try {
      await deactivateTeamMember(selectedMember.id);
      setDeactivateDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to deactivate team member:', error);
    }
  };

  const handleReactivate = async (member: PowerWashingTeamMember) => {
    try {
      await reactivateTeamMember(member.id);
    } catch (error) {
      console.error('Failed to reactivate team member:', error);
    }
  };

  const renderMemberCard = (member: PowerWashingTeamMember) => {
    const certStatus = getCertificateStatus(member);

    return (
      <Card key={member.id}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.profile?.avatar_url || undefined} />
              <AvatarFallback>{getInitials(member)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground truncate">{getFullName(member)}</h3>
                {member.role && (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    {member.role.name}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground truncate">{member.profile?.email}</p>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {member.hire_date && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    Hired {format(new Date(member.hire_date), 'MMM yyyy')}
                  </Badge>
                )}

                {certStatus.status === 'expired' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {certStatus.count} expired
                  </Badge>
                )}
                {certStatus.status === 'expiring' && (
                  <Badge variant="outline" className="text-xs border-warning text-warning">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {certStatus.count} expiring soon
                  </Badge>
                )}
                {certStatus.status === 'valid' && certStatus.count > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    {certStatus.count} certs
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              {member.is_active ? (
                <Button variant="ghost" size="icon" onClick={() => handleOpenDeactivate(member)}>
                  <UserMinus className="h-4 w-4 text-muted-foreground" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => handleReactivate(member)}>
                  <UserCheck className="h-4 w-4 text-primary" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoadingWithCertificates) {
    return (
      <MobilePageContainer>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </MobilePageContainer>
    );
  }

  return (
    <MobilePageContainer>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/power-washing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Team</h1>
            <p className="text-sm text-muted-foreground">{activeMembers.length} active members</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/power-washing/roles')}>
            <Shield className="h-4 w-4 mr-1" />
            Roles
          </Button>
          <Button onClick={handleOpenAdd} size="sm">
            <UserPlus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">
              Active ({activeMembers.length})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex-1">
              Inactive ({inactiveMembers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeMembers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No active team members</p>
                  <Button onClick={handleOpenAdd} className="mt-2">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Team Member
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeMembers.map(renderMemberCard)
            )}
          </TabsContent>

          <TabsContent value="inactive" className="mt-4 space-y-3">
            {inactiveMembers.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No inactive team members</p>
                </CardContent>
              </Card>
            ) : (
              inactiveMembers.map(renderMemberCard)
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Add an existing user to the power washing team</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {(availableProfiles || []).map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isAdding || !selectedProfileId}>
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Update role and details for {selectedMember && getFullName(selectedMember)}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hire Date</Label>
              <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMember} disabled={isUpdating}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate {selectedMember && getFullName(selectedMember)}? They will no longer appear in the active team list but can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageContainer>
  );
}
